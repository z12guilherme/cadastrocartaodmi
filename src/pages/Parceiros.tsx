import { Link } from "react-router-dom";
import logoDmi from "@/assets/logo-dmi.png";
import { PartnerCard } from "./PartnerCard";
import { partners } from "@/data/partners";
import { ArrowLeft } from "lucide-react";

const Parceiros = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navbar Simplificada */}
      <nav className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="container max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div className="flex items-center gap-2">
              <img src={logoDmi} alt="Cartão DMI" className="w-10 h-10 object-contain" />
              <span className="font-bold text-lg text-foreground hidden sm:inline">Cartão DMI</span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link to="/cadastro">
              <button className="bg-[#0EA5FF] hover:bg-[#0EA5FF]/90 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
                Fazer Pré-Cadastro
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Conteúdo Principal */}
      <main className="flex-1 py-16 bg-gradient-to-b from-white to-gray-50">
        <div className="container max-w-6xl mx-auto px-4 text-center mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Nossos Parceiros</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Conte com uma rede de parceiros de excelência oferecendo descontos exclusivos para você e sua família.
          </p>
        </div>

        {/* Grid de Parceiros */}
        <div className="container max-w-6xl mx-auto px-4 pb-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 justify-items-center">
            {partners.map((partner, index) => (
              <div key={`${index}-${partner.name}`} className="animate-in fade-in zoom-in-95 duration-500" style={{ animationDelay: `${index * 50}ms` }}>
                <PartnerCard
                  name={partner.name}
                  description={partner.description}
                  discount={partner.discount}
                  logo={partner.logo}
                  link={partner.link}
                />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Parceiros;