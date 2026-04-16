import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Scissors } from "lucide-react";

const Login = () => {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(phone, password);
    setLoading(false);
    if (error) {
      toast({ title: t("login_error_title", "Erro ao entrar"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("login_welcome_back", "Bem-vindo de volta!") });
      navigate("/agendar");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2">
            <Scissors className="h-8 w-8 text-primary" />
            <span className="font-heading text-3xl font-bold gold-text">{t("brand_name", "Nome da sua barbearia")}</span>
          </Link>
          <p className="mt-3 text-muted-foreground">{t("login_title", "Entrar na sua conta")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 glass p-8 rounded-lg">
          <div className="space-y-2">
            <Label htmlFor="phone">{t("login_phone", "Telefone")}</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 99999-9999"
              required
              className="bg-muted/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("login_password", "Senha")}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="bg-muted/50"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("login_loading", "Entrando...") : t("login_button", "Entrar")}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {t("login_no_account", "Nao tem conta?")}{" "}
            <Link to="/cadastro" className="text-primary hover:underline">
              {t("login_register", "Cadastre-se")}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
