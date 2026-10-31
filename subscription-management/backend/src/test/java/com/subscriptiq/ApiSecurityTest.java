package com.subscriptiq;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ApiSecurityTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper om;

    private String login(String user, String pass) throws Exception {
        String body = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + user + "\",\"password\":\"" + pass + "\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return "Bearer " + om.readTree(body).get("token").asText();
    }

    @Test void badCredentialsAreRejected() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"admin\",\"password\":\"wrong\"}")).andExpect(status().isUnauthorized());
    }

    @Test void registrationCreatesStaffAccountAndRejectsDuplicateUsername() throws Exception {
        String payload = "{\"username\":\"new_hackathon_user\",\"fullName\":\"New Hackathon User\",\"password\":\"StrongPass123\"}";
        String response = mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("STAFF"))
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andReturn().getResponse().getContentAsString();
        String token = "Bearer " + om.readTree(response).get("token").asText();
        mvc.perform(get("/api/customers").header("Authorization", token)).andExpect(status().isOk());
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isConflict());
    }

    @Test void protectedEndpointsNeedToken() throws Exception {
        mvc.perform(get("/api/customers")).andExpect(status().isUnauthorized());
    }

    @Test void staffCannotDeleteOrViewReports() throws Exception {
        String staff = login("staff", "Staff@123");
        mvc.perform(delete("/api/customers/1").header("Authorization", staff)).andExpect(status().isForbidden());
        mvc.perform(get("/api/reports").header("Authorization", staff)).andExpect(status().isForbidden());
        mvc.perform(get("/api/customers").header("Authorization", staff)).andExpect(status().isOk());
    }

    @Test void adminSeesDashboardAndReports() throws Exception {
        String admin = login("admin", "Admin@123");
        mvc.perform(get("/api/dashboard").header("Authorization", admin))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalSubscriptions").isNumber())
                .andExpect(jsonPath("$.revenueByMonth.length()").value(6));
        mvc.perform(get("/api/reports").header("Authorization", admin)).andExpect(status().isOk());
    }

    @Test void customerValidationReturnsFieldErrors() throws Exception {
        String admin = login("admin", "Admin@123");
        mvc.perform(post("/api/customers").header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"\",\"email\":\"not-an-email\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.email").exists())
                .andExpect(jsonPath("$.fieldErrors.name").exists());
    }

    @Test void subscriptionCreationGeneratesInvoice() throws Exception {
        String admin = login("admin", "Admin@123");
        String cust = mvc.perform(post("/api/customers").header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Test Co\",\"email\":\"test.co@example.com\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long customerId = om.readTree(cust).get("id").asLong();
        String sub = mvc.perform(post("/api/subscriptions").header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"customerId\":" + customerId + ",\"planId\":1,\"startDate\":\"" + java.time.LocalDate.now() + "\",\"autoRenew\":true}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("ACTIVE")).andReturn().getResponse().getContentAsString();
        mvc.perform(get("/api/invoices").param("q", "Test Co").header("Authorization", admin))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content[0].status").value("PENDING"));
        mvc.perform(post("/api/invoices/" + om.readTree(sub).get("id").asLong() + "/pay").header("Authorization", admin))
                .andExpect(status().is4xxClientError());
    }
}
