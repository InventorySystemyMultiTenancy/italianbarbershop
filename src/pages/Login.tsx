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
  const { language } = useLanguage();
  const navigate = useNavigate();
  const text = language === "ma"
    ? {
        errorTitle: "Khata2 f dkhol",
        welcomeBack: "Marhba b3awda!",
        subtitle: "Dkhol l 7ساب dyalek",
        phone: "Téléphone",
        password: "Mot de passe",
        loginLoading: "Kandkhol...",
        login: "Dkhol",
        noAccount: "Ma3endekch compte?",
        register: "Sajjel",
      }
    : {
        errorTitle: "Errore di accesso",
        welcomeBack: "Bentornato!",
        subtitle: "Accedi al tuo account",
        phone: "Telefono",
        password: "Password",
        loginLoading: "Accesso in corso...",
        login: "Accedi",
        noAccount: "Non hai un account?",
        register: "Registrati",
      };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(phone, password);
    setLoading(false);
    if (error) {
      toast({ title: text.errorTitle, description: error.message, variant: "destructive" });
    } else {
      toast({ title: text.welcomeBack });
      navigate("/agendar");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2">
            <Scissors className="h-8 w-8 text-primary" />
            <span className="font-heading text-3xl font-bold gold-text">Nome da sua barbearia</span>
          </Link>
          <p className="mt-3 text-muted-foreground">{text.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 glass p-8 rounded-lg">
          <div className="space-y-2">
            <Label htmlFor="phone">{text.phone}</Label>
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
            <Label htmlFor="password">{text.password}</Label>
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
            {loading ? text.loginLoading : text.login}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {text.noAccount}{" "}
            <Link to="/cadastro" className="text-primary hover:underline">
              {text.register}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
