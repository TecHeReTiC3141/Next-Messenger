"use server"

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/config/authOptions";
import prisma from "@/app/lib/db/prisma";
import { Message, User } from "@prisma/client";
import { revalidatePath } from "next/cache";

interface CreateMessageData {
    body: string,
    conversationId: string,
    image?: string,
}

type MessageWithSeen = Message & {seen: User[]};
type MessageWithSender = Message & {sender: User | null};
export type FullMessage = MessageWithSender & MessageWithSeen;

export async function createNewMessage({ body, image, conversationId }: CreateMessageData): Promise<FullMessage> {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        throw new Error("Unauthorized");
    }

    const newMessage = await prisma.message.create({
        data: {
            body,
            image,
            conversation: {
                connect: { id: conversationId },
            },
            sender: {
                connect: { id: session.user.id },
            },
            seen: {
                connect: { id: session.user.id },
            }
        },
        include: {
            seen: true,
            sender: true,
        }
    });

    const updatedConversation = await prisma.conversation.update({
        where: {
            id: conversationId,
        },
        data: {
            lastMessageAt: newMessage.createdAt
        },
        include: {
            users: true,
            messages: {
                include: {
                    seen: true,
                }
            }
        }
    });
    revalidatePath("/conversations");
    return newMessage;
}

