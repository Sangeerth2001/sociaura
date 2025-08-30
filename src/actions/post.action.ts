"use server"

import prisma from "@/lib/prisma";
import { getDbUserId } from "./user.action";
import { revalidatePath } from "next/cache";

export async function createPost(content: string, image: string) {
    try {
        const userId = await getDbUserId();

        const post = await prisma.post.create({
            data: {
                content,
                image,
                authorId: userId,
            }
        });
        revalidatePath("/"); // Revalidate the home page to show the new post
        return {success: true, post};
    } catch (error) {
        console.log("Error creating post:", error);
        return {success: false, error:"Error creating post"};
    }
}