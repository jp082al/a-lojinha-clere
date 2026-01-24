import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Wrench } from "lucide-react";

export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 text-primary">
            <Wrench className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold font-display tracking-tight">TechRepair</h1>
          <p className="text-muted-foreground">Sistema de Gestão para Assistência Técnica</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            className="w-full h-12 text-lg font-medium shadow-md hover:shadow-lg transition-all" 
            onClick={() => window.location.href = "/api/login"}
          >
            Entrar no Sistema
          </Button>
          <p className="text-xs text-center text-muted-foreground mt-4">
            Acesso seguro via Replit Auth
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
