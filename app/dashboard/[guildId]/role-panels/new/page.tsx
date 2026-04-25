import RolePanelForm from "../RolePanelForm";

type PageProps = {
  params: Promise<{
    guildId: string;
  }>;
};

export default async function NewRolePanelPage({ params }: PageProps) {
  const { guildId } = await params;

  return <RolePanelForm guildId={guildId} mode="create" />;
}
