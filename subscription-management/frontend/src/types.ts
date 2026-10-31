export type Role = 'ADMIN' | 'STAFF';
export interface User { username: string; fullName: string; role: Role }
export interface Customer { id?: number; name: string; email: string; phone?: string; company?: string }
export type Cycle = 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
export interface Plan { id?: number; name: string; description?: string; price: number; billingCycle: Cycle; features?: string; active: boolean }
export type SubStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
export interface Subscription { id: number; customer: Customer; plan: Plan; startDate: string; endDate: string; status: SubStatus; autoRenew: boolean }
export type InvStatus = 'PENDING' | 'PAID' | 'OVERDUE';
export interface Invoice { id: number; number: string; subscription: Subscription; amount: number; issueDate: string; dueDate: string; status: InvStatus; paidDate?: string; paymentMethod?: string; paymentReference?: string }
export interface Paged<T> { content: T[]; page: { size: number; number: number; totalElements: number; totalPages: number } }
export interface MonthRevenue { month: string; revenue: number }
export interface PlanStat { plan: string; subscriptions: number; mrr: number }
export interface Dashboard { totalSubscriptions: number; activeSubscriptions: number; mrr: number; overdueCount: number; overdueAmount: number; totalCustomers: number; expiringSoon: number; statusCounts: Record<string, number>; revenueByMonth: MonthRevenue[]; planStats: PlanStat[] }
export interface Alerts { expiring: Subscription[]; overdue: Invoice[] }
export interface Report { revenueByMonth: MonthRevenue[]; planStats: PlanStat[]; topCustomers: { customer: string; paid: number }[]; paidTotal: number; pendingTotal: number; overdueTotal: number }
