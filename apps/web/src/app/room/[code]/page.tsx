import Room from "./room"

export async function generateMetadata(props: {
    params: Promise<{ code: string }>
}) {
    const params = await props.params
    return {
        title: "Room - " + params.code,
    }
}

export default async function RoomPage(props: {
    params: Promise<{ code: string }>
}) {
    const { code } = await props.params
    return <Room code={code} />
}
