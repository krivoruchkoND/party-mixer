// Keep in sync with apps/web/src/lib/party-admin.ts
export const PARTY_ADMIN_NICKNAME = "krivoruchko.n"

export function isPartyAdminNickname(nickname?: string | null) {
    return nickname === PARTY_ADMIN_NICKNAME
}
