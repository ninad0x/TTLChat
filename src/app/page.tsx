"use client"

import { client } from "@/lib/client"
import { useMutation } from "@tanstack/react-query"
import { nanoid } from "nanoid"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

const ANIMALS = ["wolf", "hawk", "bear", "shark"]

const STORAGE_KEY = "chat_username"

const generateUsername = () => {
	const word = ANIMALS[Math.floor(Math.random() * ANIMALS.length)]
	return `anonymous-${word}-${nanoid(5)}`
}

export default function Home() {

	const [ username, setUsername ] = useState<string>("")
	const router = useRouter()

	useEffect(() => {
		const main = () => {
			const stored = localStorage.getItem(STORAGE_KEY)
			if (stored) {
				setUsername(stored)
				return
			}

			const generated = generateUsername()
			setUsername(generated)
			localStorage.setItem(STORAGE_KEY, generated)
		}
		main()
	}, [])

	const { mutate: createRoom } = useMutation({
		mutationFn: async () => {
			const res = await client.room.create.post()

			if (res.status === 200) {
				router.push(`/room/${res.data?.roomId}`)
			}
		}
	})

	return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
		<div className="w-full max-w-md space-y-8">
        	<div className="border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-md">
          		<div className="space-y-5">
            		<label className="flex items-center text-zinc-500">Create Room</label>

            		<div className="flex items-center gap-3">
						<div className="flex-1 bg-zinc-950 border border-zinc-800 text-sm text-zinc-500 p-3 font-mono">{username}</div>
					</div>
				</div>

				<button onClick={() => createRoom()} className="w-full bg-zinc-100 p-3 text-black text-sm font-bold hover:bg-zinc-500 cursor-pointer transition-colors mt-2 disabled:opacity-50">CREATE SECURE ROOM</button>
        	</div>
      	</div>
    </main>
  )
}