import Image from "next/image";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface GuildCardProps {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
}

export function GuildCard({ id, name, icon, owner }: GuildCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center overflow-hidden">
          {icon ? (
            <Image
              src={icon}
              alt={name}
              width={64}
              height={64}
              className="object-cover"
            />
          ) : (
            <span className="text-white text-2xl font-bold">
              {name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1">
          <CardTitle className="text-lg">{name}</CardTitle>
          <CardDescription>
            {owner ? "👑 Owner" : "⚙️ Administrator"}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Link href={`/dashboard/${id}`}>
          <Button className="w-full">Manage Server</Button>
        </Link>
      </CardContent>
    </Card>
  );
}
