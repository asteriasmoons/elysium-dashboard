import RolePanelForm from "../RolePanelForm";

export default function NewRolePanelPage({
  params,
}: {
  params: { guildId: string };
}) {
  const { guildId } = params;

  return <RolePanelForm guildId={guildId} mode="create" />;
}
