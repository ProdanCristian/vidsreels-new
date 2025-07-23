import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import FacebookProvider from "next-auth/providers/facebook"
import bcrypt from "bcryptjs"
import { prisma } from "../../../../lib/prisma"

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "public_profile",
          auth_type: "reauthenticate"
        }
      }
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          }
        })

        if (!user || !user.password) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/login",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      console.log('JWT callback triggered:', { hasUser: !!user, hasAccount: !!account, tokenId: token.id, email: token.email })
      
      if (user) {
        token.id = user.id
      }
      
      // For OAuth users, get the database user ID and image
      if (account?.provider && token.email && !token.id) {
        console.log('Fetching OAuth user from database...')
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: { id: true, name: true, image: true }
        })
        if (dbUser) {
          token.id = dbUser.id
          token.name = dbUser.name
          token.picture = dbUser.image // Store image in token
          console.log('OAuth user found, image stored in token:', dbUser.image)
        }
      }
      
      // If we don't have an image in token but have one in database (for existing sessions)
      if (token.email && !token.picture) {
        console.log('Fetching image for existing session...')
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: { image: true }
        })
        if (dbUser?.image) {
          token.picture = dbUser.image
          console.log('Image found and stored in token:', dbUser.image)
        }
      }
      
      console.log('JWT callback result:', { tokenId: token.id, tokenPicture: token.picture })
      return token
    },
    async session({ session, token }) {
      console.log('Session callback triggered:', { tokenId: token.id, tokenPicture: token.picture })
      
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.name = token.name as string || session.user.name
        session.user.image = token.picture as string || session.user.image
      }
      
      console.log('Session callback result:', { userId: session.user?.id, userImage: session.user?.image })
      return session
    },
    async signIn({ account, profile }) {
      try {
        if (account?.provider === "google" || account?.provider === "facebook") {
          // Debug: Log the profile data to see what Google sends
          console.log('OAuth Profile Data:', {
            provider: account.provider,
            email: profile?.email,
            name: profile?.name,
            picture: (profile as Record<string, unknown>)?.picture,
            image: (profile as Record<string, unknown>)?.image,
            profileKeys: profile ? Object.keys(profile) : []
          })
          
          // Create or update user in database
          if (profile?.email) {
            const profileData = profile as Record<string, unknown>
            const imageUrl = (profileData?.picture || profileData?.image) as string | null
            
            const existingUser = await prisma.user.findUnique({
              where: { email: profile.email }
            })
            
            console.log('User lookup result:', {
              email: profile.email,
              userExists: !!existingUser,
              currentImage: existingUser?.image,
              newImageUrl: imageUrl,
              willUpdate: !!(imageUrl && existingUser && existingUser.image !== imageUrl)
            })
            
            if (!existingUser) {
              // Create new user
              await prisma.user.create({
                data: {
                  email: profile.email,
                  name: profile.name || '',
                  image: imageUrl
                }
              })
              console.log('Created new user with image:', imageUrl)
            } else {
              // Update existing user's image if it's different or null
              if (imageUrl && existingUser.image !== imageUrl) {
                await prisma.user.update({
                  where: { email: profile.email },
                  data: {
                    image: imageUrl,
                    name: profile.name || existingUser.name // Also update name if provided
                  }
                })
                console.log('Updated existing user with new image:', imageUrl)
              } else {
                console.log('Skipping update - image unchanged:', {
                  currentImage: existingUser.image,
                  newImage: imageUrl
                })
              }
            }
          }
        }
        return true
      } catch (error) {
        console.error("SignIn callback error:", error)
        return true // Still allow sign in even if database operation fails
      }
    },
    async redirect({ baseUrl }) {
      // Handles redirect on signin
      return baseUrl + '/dashboard'
    },
  },
})

export { handler as GET, handler as POST } 