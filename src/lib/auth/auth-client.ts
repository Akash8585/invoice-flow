import { createAuthClient } from "better-auth/react"
export const { signIn, signUp, useSession, signOut, forgetPassword, resetPassword } = createAuthClient({
    /** The base URL of the server (optional if you're using the same domain) */
    baseURL: "http://localhost:3000"

    
})

