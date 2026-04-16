import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Scissors } from "lucide-react";

const Register = () => {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({
        title: t(
          "register_min_password",
          "A password deve ter pelo menos 6 caracteres",
        ),
        variant: "destructive",
      });
      return;
    }

    if (!birthDate) {
      toast({
        title: t(
          "register_birth_required",
          "Por favor insere a tua data de nascimento",
        ),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { error } = await signUp({
      fullName,
      phone,
      birthDate,
      password,
      email: email || undefined,
    });
    setLoading(false);
    if (error) {
      toast({
        title: t("register_error_title", "Erro ao registar"),
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: t("register_success", "Conta criada com sucesso!") });
      navigate("/agendar");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2">
            <Scissors className="h-8 w-8 text-primary" />
            <span className="font-heading text-3xl font-bold gold-text">
              {t("brand_name", "Nome da sua barbearia")}
            </span>
          </Link>
          <p className="mt-3 text-muted-foreground">
            {t("register_subtitle", "Cria a tua conta")}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 glass p-8 rounded-lg"
        >
          <div className="space-y-2">
            <Label htmlFor="fullName">
              {t("register_full_name", "Nome completo")}
            </Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={t("register_full_name_placeholder", "Joao Silva")}
              required
              className="bg-muted/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">{t("login_phone", "Telefone")}</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t("register_phone_placeholder", "(11) 99999-9999")}
              required
              className="bg-muted/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="birthDate">
              {t("register_birth_date", "Data de nascimento")}
            </Label>
            <Input
              id="birthDate"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              required
              className="bg-muted/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">
              {t("register_email_optional", "Email (opcional)")}
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("register_email_placeholder", "seu@email.com")}
              className="bg-muted/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("login_password", "Password")}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t(
                "register_password_placeholder",
                "Minimo 6 caracteres",
              )}
              required
              className="bg-muted/50"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading
              ? t("register_loading", "A criar conta...")
              : t("register_button", "Cadastrar")}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {t("register_has_account", "Ja tens conta?")}{" "}
            <Link to="/login" className="text-primary hover:underline">
              {t("register_login_here", "Entra aqui")}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Register;
