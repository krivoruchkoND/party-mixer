import Host from "./host"

export async function generateMetadata({
    params,
}: {
    params: Promise<{ code: string }>
}) {
    const { code } = await params

    return {
        title: `Screen - ${code}`,
    }
}

export default async function HostPage({
    params,
}: {
    params: Promise<{ code: string }>
}) {
    const { code } = await params
    return <Host code={code} />
}
