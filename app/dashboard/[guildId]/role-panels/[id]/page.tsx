import RolePanelForm from "../RolePanelForm";
import { getRolePanelById } from "@/lib/rolePanelAccess";

type PageProps = {
  params: Promise<{
    guildId: string;
    id: string;
  }>;
};

async function getPanel(guildId: string, id: string) {
  const panel = await getRolePanelById(guildId, id);

  if (!panel) {
    return null;
  }

  return {
    _id: String(panel._id),
    guildId: panel.guildId,
    panelName: panel.panelName,
    type: panel.type,
    selectMode: panel.selectMode,
    roles: (panel.roles ?? []).map((role) => ({
      roleId: role.roleId,
      label: role.label,
      emoji: role.emoji ?? null,
      description: role.description ?? null,
      order: role.order ?? 0,
    })),
    channelId: panel.channelId ?? null,
    messageId: panel.messageId ?? null,
    embedTitle: panel.embedTitle ?? null,
    embedDescription: panel.embedDescription ?? null,
    embedColor: panel.embedColor ?? "#00bfff",
  };
}

export default async function EditRolePanelPage({ params }: PageProps) {
  const { guildId, id } = await params;

  const panel = await getPanel(guildId, id);

  if (!panel) {
    return null;
  }

  return (
    <RolePanelForm
      guildId={guildId}
      mode="edit"
      panelId={id}
      initialPanel={panel}
    />
  );
}
