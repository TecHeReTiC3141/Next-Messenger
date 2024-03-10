"use client"

import { FaMagnifyingGlass } from "react-icons/fa6";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { getGifs } from "@/app/conversations/[conversationId]/actions";
import Image from "next/image";
import toast from "react-hot-toast";
import useConversation from "@/app/hooks/useConversation";
import { MessageWithSender } from "@/app/lib/db/message";
import { Message } from "@prisma/client";
import { MdOutlineGifBox } from "react-icons/md";

interface GifsSectionProps {
    answeringMessage: MessageWithSender | null,
    editedMessage: Message | null,
    setImage: (url: string) => void
}

export default function GifsSection({ answeringMessage, editedMessage, setImage }: GifsSectionProps) {

    const { conversationId } = useConversation();

    const [ gifs, setGifs ] = useState<string[]>([]);
    const [ timeoutId, setTimeoutId ] = useState<NodeJS.Timeout>();
    const [ isOpened, setIsOpened ] = useState<boolean>(false);

    const topRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        getGifs("", "featured")
            .then(res => setGifs(res))
            .catch(err => toast.error("Error while searching for gifs:", err));
    }, []);

    useEffect(() => {
        document.addEventListener("click", () => {
            setIsOpened(false);
        })
    }, []);

    const handleSearch = useCallback(async (query: string) => {
        clearTimeout(timeoutId);
        setTimeoutId(setTimeout(async () => {

            try {
                const result = await getGifs(query, query !== "" ? "search" : "featured");
                setGifs(result);
                topRef?.current?.scrollIntoView(true);

            } catch (err: any) {
                toast.error("Error while searching for gifs: " + err);
            }
        }, 350));

    }, [ timeoutId ]);

    return (
        <div className="absolute top-0 right-1 w-6 h-full" id="gif-section">
            {isOpened &&
                <div className="absolute w-48 lg:w-96 h-80 bottom-[153%] rounded-t-lg
                        right-0 lg:-right-10 bg-base-300 overflow-y-hidden z-10"
                     onClick={event => {
                         event.stopPropagation();
                         event.nativeEvent.stopImmediatePropagation();
                     }}>
                    <div className="w-full px-2 py-1" onClick={event => {
                        event.stopPropagation();
                        event.nativeEvent.stopImmediatePropagation();
                    }}>
                        <h3 className="font-bold text-lg">Gifs</h3>
                        <div className="relative my-2">
                            <input type="text"
                                   className="input input-sm w-full focus:outline-none focus:border-gray-700"
                                   placeholder="Search in Tenor" onChange={async ev => {
                                const query = ev.currentTarget.value;
                                await handleSearch(query);
                            }}/>
                            <FaMagnifyingGlass className="absolute top-1/2 -translate-y-1/2 right-1" size={20}/>
                        </div>
                        <div className="w-full flex flex-col lg:flex-row gap-x-2 items-start h-60 overflow-y-auto">
                            <div ref={topRef}></div>
                            <div className="flex flex-col justify-start w-full lg:w-1/2 gap-1">
                                {gifs.slice(0, gifs.length / 2).map(url => (
                                    <div key={url} className="w-full">
                                        <Image src={url} alt="Gif" width={180} height={180}
                                               className="object-cover rounded-md cursor-pointer border-2 hover:border-sky-400"
                                               onClick={() => {
                                                   setImage(url);
                                                   setIsOpened(false)
                                               }}/>
                                    </div>
                                ))}
                            </div>
                            <div className="flex flex-col justify-start w-full lg:w-1/2 gap-1">
                                {gifs.slice(gifs.length / 2, gifs.length).map(url => (
                                    <div key={url} className="w-full">
                                        <Image src={url} alt="Gif" width={180} height={180}
                                               className="object-cover rounded-md cursor-pointer border-2 hover:border-sky-400"
                                               onClick={() => {
                                                   setImage(url);
                                                   setIsOpened(false)
                                               }}/>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            }
            <MdOutlineGifBox
                className="absolute top-0 right-1 cursor-pointer text-gray-500 hover:text-gray-700"
                size={32} onClick={event => {
                event.stopPropagation();
                event.nativeEvent.stopImmediatePropagation();
                setIsOpened(prev => !prev)
            }}/>
        </div>

    )
}