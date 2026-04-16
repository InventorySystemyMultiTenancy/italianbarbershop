import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Globe2, Plus } from "lucide-react";
import Header from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { getLanguageCatalogOptions, type LanguageCatalogOption } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

function toFlagEmoji(countryCode: string) {
  const safe = String(countryCode || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(safe)) return "🌐";
  const codePoints = [...safe].map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

const AdminLanguages = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { availableLanguages, addLanguage, addingLanguage } = useLanguage();
  const navigate = useNavigate();

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [catalogOptions, setCatalogOptions] = useState<LanguageCatalogOption[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [selectedCatalogCode, setSelectedCatalogCode] = useState("");

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate("/");
    }
  }, [authLoading, user, isAdmin, navigate]);

  useEffect(() => {
    if (!user || !isAdmin) return;

    const loadCatalog = async () => {
      setCatalogLoading(true);
      setCatalogError(null);
      try {
        const catalog = await getLanguageCatalogOptions();
        setCatalogOptions(catalog);
      } catch (error) {
        setCatalogOptions([]);
        setCatalogError(error instanceof Error ? error.message : "Nao foi possivel carregar catalogo de linguas.");
      } finally {
        setCatalogLoading(false);
      }
    };

    void loadCatalog();
  }, [user, isAdmin]);

  const handleCatalogSelection = (value: string) => {
    setSelectedCatalogCode(value);
    const selected = catalogOptions.find((option) => option.code === value);
    if (!selected) return;

    setCode(selected.code);
    setName(selected.name);
    setCountryCode(selected.countryCode);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedCode = code.trim().toLowerCase();
    const normalizedName = name.trim();
    const normalizedCountry = countryCode.trim().toUpperCase();

    if (!normalizedCode || !normalizedName || !normalizedCountry) {
      toast({
        title: "Preencha os campos obrigatorios",
        description: "Informe codigo, nome e pais da lingua.",
        variant: "destructive",
      });
      return;
    }

    try {
      await addLanguage({
        code: normalizedCode,
        name: normalizedName,
        countryCode: normalizedCountry,
        flag: toFlagEmoji(normalizedCountry),
      });

      setCode("");
      setName("");
      setCountryCode("");

      toast({ title: "Idioma adicionado com sucesso" });
    } catch (error) {
      toast({
        title: "Erro ao adicionar idioma",
        description: error instanceof Error ? error.message : "Nao foi possivel adicionar idioma.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto max-w-4xl px-4 pt-24 pb-16 space-y-8">
        <div>
          <h1 className="font-heading text-3xl font-bold mb-2">
            GESTAO DE <span className="gold-text">IDIOMAS</span>
          </h1>
          <p className="text-muted-foreground">
            Adicione linguas com bandeiras para disponibilizar no seletor global do site.
          </p>
        </div>

        <div className="glass rounded-lg p-6">
          <form className="grid grid-cols-1 md:grid-cols-4 gap-4" onSubmit={handleSubmit}>
            <div className="space-y-2 md:col-span-4">
              <Label htmlFor="lang-catalog">Sugestoes da API de linguas</Label>
              <select
                id="lang-catalog"
                value={selectedCatalogCode}
                onChange={(event) => handleCatalogSelection(event.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={catalogLoading || catalogOptions.length === 0}
              >
                <option value="">
                  {catalogLoading
                    ? "Carregando linguas da API..."
                    : catalogOptions.length > 0
                      ? "Selecione um idioma sugerido"
                      : "Nenhuma sugestao da API disponivel"}
                </option>
                {catalogOptions.map((option) => (
                  <option key={`${option.code}-${option.countryCode}`} value={option.code}>
                    {option.flag ? `${option.flag} ` : ""}
                    {option.name} ({option.code.toUpperCase()} - {option.countryCode})
                  </option>
                ))}
              </select>
              {catalogError && <p className="text-xs text-destructive">{catalogError}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lang-code">Codigo</Label>
              <Input
                id="lang-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="ex: fr"
                maxLength={10}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lang-name">Nome</Label>
              <Input
                id="lang-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="ex: Francais"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lang-country">Pais (ISO)</Label>
              <Input
                id="lang-country"
                value={countryCode}
                onChange={(event) => setCountryCode(event.target.value)}
                placeholder="ex: FR"
                maxLength={2}
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full gap-2" disabled={addingLanguage}>
                <Plus className="h-4 w-4" />
                {addingLanguage ? "Salvando..." : "Adicionar"}
              </Button>
            </div>
          </form>
        </div>

        <div className="glass rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe2 className="h-5 w-5 text-primary" />
            <h2 className="font-heading text-lg font-semibold">Idiomas disponiveis</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {availableLanguages.map((language) => (
              <div key={language.code} className="rounded-lg border border-border bg-card px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl" aria-hidden="true">{language.flag}</span>
                  <div>
                    <p className="font-semibold">{language.name}</p>
                    <p className="text-xs text-muted-foreground uppercase">
                      {language.code} • {language.countryCode}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLanguages;
