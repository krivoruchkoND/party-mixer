import { Metadata } from "next"
import ManageRooms from "./manage"

export const metadata: Metadata = {
    title: "Rooms",
}

export default function ManageRoomsPage() {
    return <ManageRooms />
}
