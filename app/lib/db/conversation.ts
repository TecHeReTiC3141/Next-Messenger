"use server"

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/config/authOptions";
import prisma from "@/app/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { CreateGroupChatSchema } from "@/app/lib/schema";
import { pusherClient, pusherServer } from "@/app/lib/pusher";


export type ConversationWithUsers = Prisma.ConversationGetPayload<{
    include: { users: true },
}>;

export interface ChatCreateData {
    userId: string,
}

export async function createChat({ userId }: ChatCreateData): Promise<ConversationWithUsers | null> {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return null;

    const currentUser = session.user;

    const existingConversations = await prisma.conversation.findMany({
        where: {
            isGroup: false,
            userIds: {
                hasEvery: [ currentUser.id, userId ],
            },
        },
        include: {
            users: true,
        }
    });
    if (existingConversations.length > 0) {
        return existingConversations[ 0 ];
    }

    const newConversation = await prisma.conversation.create({
        data: {
            isGroup: false,
            users: {
                connect: [
                    { id: currentUser.id },
                    { id: userId },
                ]
            }
        },
        include: {
            users: true,
        }
    });

    newConversation.users.forEach(user => {
        if (user.email) {
            pusherServer.trigger(user.email, "conversation:new", newConversation);
        }
    })

    return newConversation;
}

export async function createGroupChat(data: FormData): Promise<ConversationWithUsers | null> {
    const res = CreateGroupChatSchema.safeParse(data);
    if (!res.success) {
        return null;
    }
    const { data: { name, members } } = res;
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return null;

    const currentUser = session.user;

    const newConversation = await prisma.conversation.create({
        data: {
            name,
            isGroup: true,
            users: {
                connect: [
                    { id: currentUser.id },
                    ...(members.map(member => (
                        { id: member.value }
                    ))),
                ]
            }
        },
        include: {
            users: true,
        }
    });

    newConversation.users.forEach(user => {
        if (user.email) {
            pusherServer.trigger(user.email, "conversation:new", newConversation);
        }
    });

    return newConversation;
}

export type ConversationWithMessages = Prisma.ConversationGetPayload<{
    include: {
        messages: {
            include: {
                sender: true,
                seen: true,
            }
        }
    }
}>;

export type ConversationInList = ConversationWithMessages & ConversationWithUsers;

export async function getUserConversations(): Promise<ConversationInList[]> {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        return [];
    }
    return prisma.conversation.findMany({
        where: {
            userIds: {
                has: session.user.id,
            },
        },
        orderBy: { lastMessageAt: 'desc' },
        include: {
            users: true,
            messages: {
                include: {
                    sender: true,
                    seen: true,
                }
            }
        }
    });
}

export async function deleteConversationById(conversationId: string) {

    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        throw new Error("Unauthorized");
    }

    const currentUser = session.user;

    const existingConversation = await prisma.conversation.findUnique({
        where: {
            id: conversationId,
        },
        include: {
            users: true,
        }
    });

    if (existingConversation === null) {
        throw new Error("Invalid ID");
    }

    const deletedConversation = await prisma.conversation.delete({
        where: {
            id: conversationId,
            userIds: {
                hasSome: [ currentUser.id ],
            }
        }
    });
    if (deletedConversation === null) {
        throw new Error("Conversation not found");
    }

    existingConversation.users.forEach(user => {
        if (user.email) {
            pusherServer.trigger(user.email, "conversation:remove", existingConversation);
        }
    })

    return redirect("/conversations");
}

