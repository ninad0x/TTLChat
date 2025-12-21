"use client";
import { useUsername } from "@/hooks/use-username";
import { client } from "@/lib/client";
import { useRealtime } from "@/lib/realtime-client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";


export default function Page() {
    return (<Suspense>
        <Lobby />
    </Suspense>)
}


function formatTimeRemaining(seconds: number) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
}

function Lobby() {

    const params = useParams()
    const roomId = params.roomId as string
    const router = useRouter()

    const inputRef = useRef<HTMLInputElement>(null)
    const { username } = useUsername()
	const [ copyStatus, setCopyStatus ] = useState("COPY")
    const [ timeRemaining, setTimeRemaining ] = useState<number | null>(null)
    const [ input, setInput ] = useState("")


    const { data: ttlData } = useQuery({
        queryKey: ["ttl", roomId],
        queryFn: async () => {
            const res = await client.room.ttl.get({ query: { roomId } })
            return res.data
        },
    })

    useEffect(() => {
        if (ttlData?.ttl !== undefined) {
            setTimeRemaining(ttlData.ttl)
        }
    }, [ttlData?.ttl])

    useEffect(() => {
        if (timeRemaining === null || timeRemaining < 0) return

        if (timeRemaining === 0) {
            router.push("/?destroyed=true")
            return
        }
        
        const interval = setInterval(() => {
            setTimeRemaining((prev) => {
                if (prev === null || prev <= 1) {
                    clearInterval(interval)
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(interval)

    }, [router])

    const { data: messages, refetch } = useQuery({
        queryKey: ["messages", roomId],
        queryFn: async () => {
            const res = await client.messages.get({
                query: { roomId } })

            return res.data
        }
    })

    const { mutate: sendMessage, isPending } = useMutation({
        mutationFn: async ({text}: {text: string}) => {
            await client.messages.post({
                sender: username, text}, { query: { roomId }})

            setInput("")
        }
    })

    useRealtime({
        channels: [roomId],
        events: ["chat.message", "chat.destroy"],
        onData: ({ event }) => {
            if (event === "chat.message") {
                refetch()
            }

            if (event === "chat.destroy") {
                router.push("/?destroyed=true")
            }
        }
    })

    const { mutate: destroyRoom } = useMutation({
        mutationFn: async () => {
            await client.room.delete(null, {
                query: { roomId }
            })
        }
    })

	const copyLink = () => {
		const url = window.location.href
		navigator.clipboard.writeText(url)
		setCopyStatus("COPIED!")
		setTimeout(() => setCopyStatus("COPY"), 2000)
	}

    return <main className="flex flex-col h-screen max-h-screen overflow-hidden">
        <header className="border border-zinc-800 p-4 flex items-center justify-between bg-zinc-900/30">
            <div className="flex items-center gap-4">
                <div className="flex flex-col">
                    <span className="text-sm text-shadow-zinc-500">Room ID</span>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-green-500">{roomId}</span>
                        <button onClick={copyLink} className="text-[10px] bg-zinc-800 hover:bg-zinc-700 px-2 py-0.5 rounded hover:text-zinc-200 transition-colors">{copyStatus}</button>
                    </div>
                </div>
                
                <div className="h-9 w-px bg-zinc-800"/>

                <div className="flex flex-col">
                    <span className="text-sm text-zinc-500 uppercase">Self-Destruct</span>
                    <span className={`text-sm font-bold flex items-center gap-2 ${
                        timeRemaining !== null && timeRemaining < 60 
                        ? "text-red-500"
                        : "text-amber-500"
                    }`}>{timeRemaining !== null
                        ? formatTimeRemaining(timeRemaining)
                        : "--:--"
                    }</span>
                </div>
            </div>
            <button onClick={() => destroyRoom()} className="text-xs bg-zinc-800 hover:bg-red-600 hover:text-white px-3 py-1.5 rounded text-zinc-400 font-bold transition-all group flex items-center gap-2 disabled:opacity-50"><span className="group-hover:animate-pulse">💣</span>DESTROY NOW</button>
        </header>

        <div className="flex-1 overflow-auto p-4 space-y-4 scrollbar-thin">
            {messages?.messages.length === 0 && (
                <div className="flex justify-center items-center h-full">
                    <p className="text-sm text-zinc-600 font-mono">No messages yet, start the converstation</p>
                </div>)}

            {messages?.messages.map((m) => (
                <div key={m.id} className="flex flex-col items-start">
                    <div className="max-w-[80%] group">
                        <div className="flex items-baseline gap-3 mb-1">
                            <span className={`text-xs font-bold ${m.sender === username 
                                ? "text-green-500"
                                : "text-blue-500"
                            }`}>{m.sender === username
                                ? "YOU"
                                : m.sender
                                }</span>

                                <span className="text-[10px] text-zinc-500">
                                    {format(m.timestamp, "HH:mm")}
                                </span>
                        </div>
                        <p className="text-sm text-zinc-300 leading-relaxed break-all">{m.text}</p>
                    </div>
                </div>
            ))}

        </div>

        <div className="flex gap-3 p-4 border-t border-zinc-800 bg-zinc-900/30">
            <div className="flex-1 relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-green-500 animate-pulse">{">"}</span>
                <input 
                    ref={inputRef}
                    value={input}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && input.trim()) {
                            sendMessage({text: input})
                            inputRef.current?.focus()
                        }
                    }}
                    placeholder="Type message..."
                    onChange={(e) => setInput(e.target.value)}
                    autoFocus 
                    type="text" 
                    className="w-full bg-black border border-zinc-800 focus:border-zinc-700 focus:outline-none transition-colors text-zinc-100 placeholder::text-zinc-700 py-3 pl-8 pr-4 text-sm" />
            </div>
            <button onClick={() => {
                    sendMessage({text: input})
                    inputRef.current?.focus()
                }} 
                disabled={ !input.trim() || isPending }
                className="bg-zinc-800 text-zinc-400 px-6 text-sm font-bold hover:text-zinc-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">SEND</button>
        </div>
    </main> 
}