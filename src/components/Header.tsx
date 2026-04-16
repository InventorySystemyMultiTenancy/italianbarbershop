import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar, Languages, LogOut, Shield } from "lucide-react";
import logoImage from "@/assets/Chincoa Cort's logo.png";

const Header = () => {
  const { user, isAdmin, signOut } = useAuth();
  const { language, setLanguage, availableLanguages, selectedLanguage } = useLanguage();
  const isMoroccan = language === "ma";
  const text = isMoroccan
    ? {
        book: "Hjz",
        myAppointments: "Mawaid dyali",
        myAppointmentsShort: "Mawaid",
        login: "Dkhol",
        register: "Sajjel",
      }
    : {
        book: "Prenota",
        myAppointments: "I miei appuntamenti",
        myAppointmentsShort: "Appunt.",
        login: "Accedi",
        register: "Registrati",
      };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-1.5">
          <img src={logoImage} alt="Logo Nome da sua barbearia" className="h-14 w-14 object-contain" />
          <span className="hidden md:inline font-heading text-lg lg:text-xl font-bold gold-text">Nome da sua barbearia</span>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Languages className="h-4 w-4" />
                <span>{selectedLanguage.flag}</span>
                <span className="hidden sm:inline">{selectedLanguage.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-56">
              <DropdownMenuLabel>Idioma do site</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {availableLanguages.map((item) => (
                <DropdownMenuItem key={item.code} onClick={() => setLanguage(item.code)}>
                  <span className="mr-2" aria-hidden="true">{item.flag}</span>
                  <span className="flex-1">{item.name}</span>
                  {item.code === language && <span className="text-xs text-primary">ativo</span>}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {user ? (
            <>
              <Link to="/agendar">
                <Button variant="ghost" size="sm" className="gap-2 text-foreground hover:text-primary">
                  <Calendar className="h-4 w-4" />
                  <span className="hidden sm:inline">{text.book}</span>
                </Button>
              </Link>
              <Link to="/meus-agendamentos">
                <Button variant="ghost" size="sm" className="text-foreground hover:text-primary">
                  <span className="hidden sm:inline">{text.myAppointments}</span>
                  <span className="sm:hidden">{text.myAppointmentsShort}</span>
                </Button>
              </Link>
              {isAdmin && (
                <>
                  <Link to="/admin/languages">
                    <Button variant="ghost" size="sm" className="gap-2 text-foreground hover:text-primary">
                      <Languages className="h-4 w-4" />
                      <span className="hidden sm:inline">Idiomas</span>
                    </Button>
                  </Link>
                  <Link to="/admin">
                    <Button variant="ghost" size="sm" className="gap-2 text-primary">
                      <Shield className="h-4 w-4" />
                      <span className="hidden sm:inline">Admin</span>
                    </Button>
                  </Link>
                </>
              )}
              <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground hover:text-destructive">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm" className="text-foreground hover:text-primary">{text.login}</Button>
              </Link>
              <Link to="/cadastro">
                <Button size="sm">{text.register}</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
