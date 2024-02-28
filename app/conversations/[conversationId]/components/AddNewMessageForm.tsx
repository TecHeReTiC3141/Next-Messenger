"use client"

import useConversation from "@/app/hooks/useConversation";
import { zodResolver } from "@hookform/resolvers/zod";
import { SubmitHandler, useForm } from "react-hook-form";
import { AddMessageFormSchema } from "@/app/lib/schema";
import { z } from "zod";
import { MdPhoto } from "react-icons/md";
import { HiPaperAirplane } from "react-icons/hi2";
import { handleNewMessage } from "@/app/conversations/[conversationId]/actions";
import toast from "react-hot-toast";
import { CldUploadButton } from "next-cloudinary";
import { createNewMessage } from "@/app/lib/db/message";


type formFields = z.infer<typeof AddMessageFormSchema>;

export default function AddNewMessageForm() {

    const { conversationId } = useConversation();


    const {
        register,
        handleSubmit,
        watch,
        reset,
        formState: { errors, isLoading }
    } = useForm<formFields>({
        resolver: zodResolver(AddMessageFormSchema),
    });

    const watchMessage = watch("message");

    const onSubmit: SubmitHandler<formFields> = async (data) => {
        reset();
        console.log(data);
        const res = await handleNewMessage(data as unknown as FormData);
        if (!res) {
            toast.error("Something went wrong while sending your message. Please try again later");
        }
    }

    async function onUpload(result: any) {
        const data = {image: result?.info?.secure_url, conversationId, body: ""}
        await createNewMessage(data);
    }
    return (
        <form onSubmit={handleSubmit(onSubmit)} className="flex gap-2 items-center border-t border-neutral px-2 py-4">
            <CldUploadButton
                options={{ maxFiles: 1}}
                onUpload={onUpload}
                uploadPreset="uupnbab6"
            >
                <MdPhoto className="text-sky-500" size={28}/>
            </CldUploadButton>
            <input type="hidden" value={conversationId} {...register("conversationId")}/>
            <input type="hidden" {...register("image")}/>
            <input type="text" className="flex-1 input input-sm focus:outline-none rounded-full bg-base-200"
                   placeholder="Write a message..." {...register("message")} />
            <button disabled={watchMessage?.length == 0} className="btn btn-circle btn-sm hover:shadow-md btn-primary">
                <HiPaperAirplane/>
            </button>
        </form>
    )
}