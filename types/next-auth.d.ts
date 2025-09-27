import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    isAdmin?: boolean
    loginTime?: number
  }
  
  interface User {
    isAdmin?: boolean
  }
}