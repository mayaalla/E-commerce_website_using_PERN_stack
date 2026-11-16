import { ShieldX } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NotAuthorizedPanel() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card className="w-full max-w-lg">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <ShieldX className="size-6" aria-hidden="true" />
          </div>
          <CardTitle>Not Authorized</CardTitle>
          <CardDescription>
            You do not have permission to open this page.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button onClick={() => navigate("/", { replace: true })}>
            Go Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
