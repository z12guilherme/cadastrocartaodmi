import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Stethoscope,
  TestTubes,
  Hospital,
  HeartPulse,
  MapPin,
  Phone,
  Mail,
  Clock,
  Star,
  ArrowRight,
  CheckCircle2,
  Users,
  Shield,
} from "lucide-react";
import heroImg from "@/assets/hero-family.jpg";
import consultasImg from "@/assets/consultas.jpg";
import examesImg from "@/assets/exames.jpg";
import hospitalImg from "@/assets/hospital.jpg";
import logoDmi from "@/assets/logo-dmi.png";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="container max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logoDmi} alt="Cartão DMI" className="w-10 h-10 object-contain" />
            <span className="font-bold text-lg text-foreground">Cartão DMI</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#servicos" className="hover:text-primary transition-colors">Serviços</a>
            <a href="#sobre" className="hover:text-primary transition-colors">Sobre</a>
            <a href="#depoimentos" className="hover:text-primary transition-colors">Depoimentos</a>
            <a href="#contato" className="hover:text-primary transition-colors">Contato</a>
          </div>
          <Link to="/cadastro">
            <Button size="sm">Fazer Pré-Cadastro</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImg} alt="Família saudável" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--hero-overlay)/0.92)] via-[hsl(var(--hero-overlay)/0.8)] to-[hsl(var(--hero-overlay)/0.5)]" />
        </div>
        <div className="relative container max-w-6xl mx-auto px-4 py-20 md:py-32">
          <div className="max-w-xl space-y-6">
            <div className="inline-flex items-center gap-2 bg-primary/20 border border-primary/30 rounded-full px-4 py-1.5 text-sm text-primary-foreground">
              <HeartPulse className="w-4 h-4" />
              REDEDMI — Saúde acessível para todos
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground leading-tight">
              Acesso facilitado a serviços de <span className="text-[hsl(152,60%,60%)]">saúde</span>
            </h1>
            <p className="text-lg text-primary-foreground/80 leading-relaxed">
              O Cartão DMI oferece consultas, exames e procedimentos com até 50% de desconto.
              Sem burocracia, sem longas esperas.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/cadastro">
                <Button size="lg" className="text-base px-8 gap-2">
                  Solicitar Cartão <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <a href="#sobre">
                <Button variant="outline" size="lg" className="text-base px-8 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                  Saiba mais
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Strip */}
      <section className="bg-primary">
        <div className="container max-w-6xl mx-auto px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { num: "50%", label: "de desconto" },
              { num: "10+", label: "especialidades" },
              { num: "5+", label: "cidades atendidas" },
              { num: "1000+", label: "beneficiários" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-2xl md:text-3xl font-bold text-primary-foreground">{s.num}</p>
                <p className="text-sm text-primary-foreground/80">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="servicos" className="py-16 md:py-24">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">Nossos Serviços</p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Serviços de Saúde Acessíveis
            </h2>
            <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
              Acesse serviços médicos com preços acessíveis e sem burocracia, facilitando sua saúde.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <ServiceCard
              image={consultasImg}
              icon={<Stethoscope className="w-5 h-5" />}
              title="Consultas Médicas Rápidas"
              description="Realize consultas com profissionais credenciados em toda a REDEDMI com facilidade e valores acessíveis."
            />
            <ServiceCard
              image={examesImg}
              icon={<TestTubes className="w-5 h-5" />}
              title="Exames Acessíveis"
              description="Faça exames em laboratórios confiáveis com descontos especiais para usuários do Cartão DMI."
            />
            <ServiceCard
              image={hospitalImg}
              icon={<Hospital className="w-5 h-5" />}
              title="Hospital Santa Fé"
              description="Atendimento de urgência e cirurgias de qualidade. Procedimentos médicos com valores reduzidos."
            />
          </div>
        </div>
      </section>

      {/* About */}
      <section id="sobre" className="py-16 md:py-24 bg-secondary">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider">Sobre o Cartão DMI</p>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                Rede própria e credenciada em Pernambuco
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                O Cartão DMI oferece acesso facilitado a serviços médicos com preços reduzidos em clínicas,
                laboratórios e hospitais credenciados em Pernambuco. Promovemos saúde com dignidade, respeito e humanidade.
              </p>
              <ul className="space-y-3">
                {[
                  "Consultas a partir de R$ 25,00",
                  "Rede credenciada em diversas cidades",
                  "Sem carência para consultas",
                  "Planos Individual e Familiar",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-foreground">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/cadastro">
                <Button size="lg" className="gap-2 mt-2">
                  Solicitar Cartão <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <BenefitCard icon={<Users className="w-6 h-6" />} title="Familiar" desc="Inclua até 5 dependentes no seu plano" />
              <BenefitCard icon={<Shield className="w-6 h-6" />} title="Confiança" desc="Rede credenciada de qualidade" />
              <BenefitCard icon={<HeartPulse className="w-6 h-6" />} title="Humanizado" desc="Atendimento digno e respeitoso" />
              <BenefitCard icon={<Stethoscope className="w-6 h-6" />} title="Completo" desc="Consultas, exames e procedimentos" />
            </div>
          </div>
        </div>
      </section>

      {/* Pricing CTA */}
      <section className="py-16 md:py-24">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="bg-primary rounded-2xl p-8 md:p-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              Sua família merece o melhor cuidado
            </h2>
            <p className="text-primary-foreground/80 text-lg mb-8 max-w-2xl mx-auto">
              A partir de R$ 30,00/mês no plano individual ou R$ 25,00/vida no plano familiar.
              Taxa de adesão de apenas R$ 75,00.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/cadastro">
                <Button size="lg" variant="secondary" className="text-base px-8 gap-2">
                  Fazer Pré-Cadastro <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section id="depoimentos" className="py-16 md:py-24 bg-secondary">
        <div className="container max-w-6xl mx-auto px-4 text-center">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">Depoimentos</p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-10">
            O que dizem nossos beneficiários
          </h2>
          <div className="max-w-2xl mx-auto bg-card rounded-2xl p-8 shadow-md border border-border">
            <div className="flex justify-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-[hsl(45,90%,50%)] text-[hsl(45,90%,50%)]" />
              ))}
            </div>
            <blockquote className="text-lg text-foreground italic leading-relaxed mb-6">
              "O Cartão DMI facilitou meu acesso a consultas e exames. Os preços são justos e a rede
              de serviços é excelente. Recomendo a todos!"
            </blockquote>
            <p className="font-semibold text-foreground">Manoela Carla</p>
            <p className="text-sm text-muted-foreground">Beneficiária do Cartão DMI</p>
          </div>
        </div>
      </section>

      {/* Contact / Location */}
      <section id="contato" className="py-16 md:py-24">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">Contato</p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Encontre o Cartão DMI
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <ContactCard
              icon={<MapPin className="w-6 h-6" />}
              title="Sede do Cartão DMI"
              lines={["Av. Geminiano Maciel, 400 A", "Boa Vista - Belo Jardim, PE", "55.157-010"]}
            />
            <ContactCard
              icon={<Clock className="w-6 h-6" />}
              title="Horário de Atendimento"
              lines={["Seg - Sexta: 7:00 – 18:00", "Sábado: 7:30 – 12:00"]}
            />
            <ContactCard
              icon={<Phone className="w-6 h-6" />}
              title="Contato"
              lines={["(81) 3726-2899", "(81) 9.9325-7830", "cartaodmi@rededmi.com.br"]}
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-accent py-10">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src={logoDmi} alt="Cartão DMI" className="w-8 h-8 object-contain brightness-200" />
              <span className="font-bold text-accent-foreground">Cartão DMI</span>
              <span className="text-accent-foreground/60 text-sm ml-2">REDEDMI</span>
            </div>
            <div className="flex items-center gap-4 text-accent-foreground/80 text-sm">
              <a href="mailto:cartaodmi@rededmi.com.br" className="flex items-center gap-1 hover:text-accent-foreground transition-colors">
                <Mail className="w-4 h-4" /> cartaodmi@rededmi.com.br
              </a>
              <a href="tel:8137262899" className="flex items-center gap-1 hover:text-accent-foreground transition-colors">
                <Phone className="w-4 h-4" /> (81) 3726-2899
              </a>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-accent-foreground/10 text-center text-sm text-accent-foreground/60">
            <p>© 2025 REDEDMI. Todos os direitos reservados.</p>
            <p className="mt-1 text-xs max-w-3xl mx-auto">
              A REDEDMI é um ecossistema que integra soluções de saúde acessível e de qualidade no interior de
              Pernambuco. Reunimos o Cartão DMI, as Clínicas DMI, o Hospital Santa Fé, os Hospitais DMI e o
              Instituto Fernando de Abreu.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

function ServiceCard({
  image,
  icon,
  title,
  description,
}: {
  image: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="group bg-card rounded-xl overflow-hidden shadow-sm border border-border hover:shadow-lg transition-shadow">
      <div className="h-48 overflow-hidden">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      </div>
      <div className="p-6 space-y-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-card-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function BenefitCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="bg-card rounded-xl p-5 border border-border shadow-sm text-center space-y-2">
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto">
        {icon}
      </div>
      <h4 className="font-semibold text-card-foreground">{title}</h4>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </div>
  );
}

function ContactCard({
  icon,
  title,
  lines,
}: {
  icon: React.ReactNode;
  title: string;
  lines: string[];
}) {
  return (
    <div className="bg-card rounded-xl p-6 border border-border shadow-sm text-center space-y-3">
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto">
        {icon}
      </div>
      <h4 className="font-semibold text-card-foreground">{title}</h4>
      <div className="space-y-1">
        {lines.map((l) => (
          <p key={l} className="text-sm text-muted-foreground">{l}</p>
        ))}
      </div>
    </div>
  );
}

export default LandingPage;
