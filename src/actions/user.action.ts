"use server"

import prisma from "@/lib/prisma";
import { auth, currentUser } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache";

export async function syncUser() {
    try {
        const {userId} = await auth()
        const user = await currentUser()

        if (!userId || !user) return;

        //check if user already exists in db
        const existingUser = await prisma.user.findUnique({
            where: {
                clerkId: userId,
            }
        })

        if (existingUser) return existingUser;
        
        const dbUser = await prisma.user.create({
            data:{
                clerkId: userId,
                name: `${user.firstName || ""} ${user.lastName || ""}`,
                username: user.username ?? user.emailAddresses[0].emailAddress.split("@")[0],
                email: user.emailAddresses[0].emailAddress,
                image: user.imageUrl,

            }
        })

        return dbUser;
    } catch (error) {
        console.log("Error syncing user:", error);
    }
}

export async function getUserByClerkId(clerkId: string) {
    return prisma.user.findUnique({
        where: {
            clerkId,
        },
        include:{
            _count:{
                select:{
                    followers: true,
                    following: true,
                    posts: true,
                },
            },
        },
    });
}


export async function getDbUserId(){
    const {userId:clerkId} = await auth();
    if(!clerkId) throw new Error("Not authenticated");

    const user = await getUserByClerkId(clerkId);

    if(!user) throw new Error("User not found");

    return user.id;

}

export async function getRandomUsers(){
    try {
        const userId = await getDbUserId();

        //get 3 random users excluding the current user and who the current user is following
        const randomUsers = await prisma.user.findMany({
            where:{
                AND:[
                    {NOT: {id: userId}},
                    {
                        NOT:{
                            followers: {
                                some: {
                                    followerId: userId
                                }
                            }
                        }
                    },
                ]
            },
            select:{
                id: true,
                name: true,
                username: true,
                image: true,
                _count:{
                    select:{
                        followers: true,
                    }
                }
            },
            take: 3,
        })

        return randomUsers;
    } catch (error) {
        console.log("Error getting random users:", error);
        return [];
    }
}

export async function toggleFollow(targetUserId: string) {
    try {
        const userId = await getDbUserId();
        if(userId === targetUserId) throw new Error("You cannot follow yourself");
        const existingFollow = await prisma.follows.findUnique({
            where:{
                followerId_followingId:{
                    followerId: userId,
                    followingId: targetUserId,
                }
            }
        })

        if(existingFollow){
            //unfollow
            await prisma.follows.delete({
                where:{
                    followerId_followingId:{
                        followerId: userId,
                        followingId: targetUserId,
                    }
                }
            })
        }else{
            //follow
            await prisma.$transaction([
                prisma.follows.create({
                    data:{
                        followerId: userId,
                        followingId: targetUserId,
                    }
                }),

                prisma.notification.create({
                    data:{
                        type: "FOLLOW",
                        userId: targetUserId, //the user who will receive the notification
                        creatorId: userId, //the user who triggered the notification
                    }
                })
            ])
        }

        revalidatePath("/");
        return {success: true};

    } catch (error) {
        console.log("Error toggling follow:", error);
        return {success: false, error: "Error toggling follow"};
    }
}
