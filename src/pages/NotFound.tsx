import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

const NotFound = () => {
  const location = useLocation();
  const { language } = useLanguage();
  const text = language === "ma"
    ? { message: "Oops! Saf7a machi mawjouda", back: "Rje3 l saf7a l2owla" }
    : { message: "Ops! Pagina non trovata", back: "Torna alla home" };

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">{text.message}</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          {text.back}
        </a>
      </div>
    </div>
  );
};

export default NotFound;
