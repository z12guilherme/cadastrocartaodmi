import { Link } from "react-router-dom";
// Swiper Imports
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, Navigation, EffectFade, EffectCoverflow } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-fade';
import 'swiper/css/effect-coverflow';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { Button } from "@/components/ui/button";
import {
  Stethoscope,
  TestTubes,
  HeartPulse,
  MapPin,
  Phone,
  Mail,
  Star,
  ArrowRight,
  ShieldCheck,
  Instagram,
  Lock,
  Search,
  CreditCard,
} from "lucide-react";
import heroImg from "@/assets/hero-family.jpg";
import logoDmi from "@/assets/logo-dmi.png";
import { PartnerCard } from "./PartnerCard";
import { partners } from "@/data/partners";

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
          <div className="flex items-center gap-2 sm:gap-4">
            <Link to="/admin/login">
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground hidden lg:flex">
                <Lock className="w-4 h-4" />
                <span>Área Admin</span>
              </Button>
            </Link>
            <Link to="/consulta">
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground hidden md:flex">
                <Search className="w-4 h-4" />
                <span>Consultar Status</span>
              </Button>
            </Link>
            <Link to="/acessar-carteirinha">
              <Button variant="outline" size="sm" className="gap-2 border-[#0EA5FF] text-[#0EA5FF] hover:bg-[#0EA5FF]/10">
                <CreditCard className="w-4 h-4" />
                <span className="hidden sm:inline">Carteirinha Digital</span>
              </Button>
            </Link>
            <Link to="/cadastro">
              <Button className="bg-[#0EA5FF] hover:bg-[#0EA5FF]/90 text-white">Fazer Pré-Cadastro</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative h-[calc(100vh-70px)] bg-black">
        <Swiper
          modules={[Autoplay, Pagination, Navigation, EffectFade]}
          effect="fade"
          fadeEffect={{ crossFade: true }}
          speed={1500}
          loop={true}
          autoplay={{
            delay: 5000,
            disableOnInteraction: false,
          }}
          pagination={{ clickable: true }}
          navigation={true}
          className="w-full h-full"
        >
          {/* Slide 1 - DMI Main */}
          <SwiperSlide className="relative">
            <div className="absolute inset-0 bg-black/40 z-[5]" />
            <img src={heroImg} alt="Família DMI" className="w-full h-full object-cover" />
            <div className="absolute top-[60%] left-[50%] md:left-[30%] -translate-x-1/2 -translate-y-1/2 text-center text-white z-10 w-[90%] md:w-1/2">
              <h6 className="font-[Poppins] text-xl font-normal uppercase tracking-[2px] mb-2 drop-shadow-md animate__animated animate__fadeInTopLeft">
                Bem-vindo ao <span>Cartão DMI</span>
              </h6>
              <h1 className="font-[Poppins] text-[#0EA5FF] text-5xl md:text-7xl font-bold tracking-[3px] opacity-90 mb-4 drop-shadow-md animate__animated animate__fadeInTopRight">
                Saúde Acessível
              </h1>
              <p className="font-[Poppins] text-white text-lg md:text-2xl font-normal tracking-[1px] opacity-90 mb-8 drop-shadow-md animate__animated animate__fadeInBottomLeft">
                Saúde de Qualidade ao Alcance de Todos.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/cadastro">
                  <button className="bg-[#0EA5FF] hover:bg-[#0EA5FF]/80 text-white px-8 py-3 rounded-full font-medium transition-all animate__animated animate__fadeInBottomLeft">
                    Solicitar Cartão
                  </button>
                </Link>
                <Link to="/acessar-carteirinha">
                  <button className="border-2 border-white bg-white/10 backdrop-blur-sm text-white hover:bg-white hover:text-[#0EA5FF] px-8 py-3 rounded-full font-medium transition-all animate__animated animate__fadeInBottomRight flex items-center justify-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Carteirinha Digital
                  </button>
                </Link>
                <a href="https://play.google.com/store/apps/details?id=com.sigpaf.dmicliente&pcampaignid=web_share" target="_blank" rel="noopener noreferrer">
                  <button className="border-2 border-white text-white hover:bg-white hover:text-[#3532EA] px-8 py-3 rounded-full font-medium transition-all animate__animated animate__fadeInBottomRight">
                    Baixe o App
                  </button>
                </a>
              </div>
            </div>
          </SwiperSlide>

          {/* Slide 2 - Placeholder / Consultas (Reusing heroImg for demo, ideally use a different image) */}
          <SwiperSlide className="relative">
            <div className="absolute inset-0 bg-black/40 z-[5]" />
            <img src={heroImg} alt="Consultas Médicas" className="w-full h-full object-cover object-right" />
            <div className="absolute top-[60%] left-[50%] md:left-[30%] -translate-x-1/2 -translate-y-1/2 text-center text-white z-10 w-[90%] md:w-1/2">
              <h6 className="font-[Poppins] text-xl font-normal uppercase tracking-[2px] mb-2 drop-shadow-md animate__animated animate__fadeInTopLeft">
                Rede Credenciada
              </h6>
              <h1 className="font-[Poppins] text-[#64E627] text-5xl md:text-7xl font-bold tracking-[3px] opacity-90 mb-4 drop-shadow-md animate__animated animate__fadeInTopRight">
                Consultas Rápidas
              </h1>
              <p className="font-[Poppins] text-white text-lg md:text-2xl font-normal tracking-[1px] opacity-90 mb-8 drop-shadow-md animate__animated animate__fadeInBottomLeft">
                Agende consultas com especialistas sem burocracia.
              </p>
            </div>
          </SwiperSlide>
        </Swiper>
      </section>

      {/* Simplified Services */}
      <section id="servicos" className="py-16 md:py-24">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-6 text-center">
            <BenefitItem
              icon={<Stethoscope className="w-8 h-8 text-[#0EA5FF]" />}
              title="Consultas Médicas"
              description="Realize consultas com valores acessíveis e rápidos."
            />
            <BenefitItem
              icon={<TestTubes className="w-8 h-8 text-[#0EA5FF]" />}
              title="Exames Rápidos"
              description="Exames laboratoriais com preços reduzidos e agilidade."
            />
            <BenefitItem
              icon={<ShieldCheck className="w-8 h-8 text-[#0EA5FF]" />}
              title="Serviços de Qualidade"
              description="Procedimentos médicos sem burocracia e com qualidade."
            />
          </div>
        </div>
      </section>

      {/* About */}
      <section id="sobre" className="py-16 md:py-24 bg-secondary">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-foreground">
                Sobre o Cartão DMI
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                O Cartão DMI oferece acesso facilitado a serviços médicos com preços reduzidos em clínicas,
                laboratórios e hospitais credenciados em Pernambuco.
              </p>
              <Link to="/cadastro">
                <Button className="bg-[#0EA5FF] hover:bg-[#0EA5FF]/90 text-white gap-2 mt-2">
                  Saiba mais <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
            <div className="bg-card p-6 rounded-lg border">
              <h3 className="font-semibold text-lg mb-2 text-foreground">Rede própria e credenciada</h3>
              <p className="text-muted-foreground text-sm">
                Promover o acesso facilitado e humanizado à saúde, oferecendo serviços médicos de qualidade com valores acessíveis para indivíduos, famílias e empresas, contribuindo para o bem-estar e a dignidade das pessoas.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Partners - 3D Carousel */}
      <section id="parceiros" className="py-16 bg-gradient-to-b from-white to-gray-50 overflow-hidden">
        <div className="container mx-auto px-4 text-center mb-10">
          <h2 className="text-3xl font-bold text-foreground mb-4">Nossos Parceiros</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Conte com uma rede de parceiros de excelência oferecendo descontos exclusivos para você e sua família.
          </p>
        </div>

        <Swiper
          effect={'coverflow'}
          grabCursor={true}
          centeredSlides={true}
          slidesPerView={'auto'}
          coverflowEffect={{
            rotate: 50,
            stretch: 0,
            depth: 100,
            modifier: 1,
            slideShadows: true,
          }}
          autoplay={{
            delay: 3000,
            disableOnInteraction: false,
          }}
          loop={true}
          navigation={true}
          modules={[EffectCoverflow, Autoplay, Navigation]}
          className="w-full py-10 partners-swiper"
        >
          {[...partners, ...partners].map((partner, index) => (
            <SwiperSlide key={`${index}-${partner.name}`} className="!w-auto !h-auto bg-transparent border-none shadow-none select-none">
               <PartnerCard 
                 name={partner.name}
                 description={partner.description}
                 discount={partner.discount}
                 logo={partner.logo}
                 link={partner.link}
               />
            </SwiperSlide>
          ))}
        </Swiper>
      </section>

      {/* Final CTA */}
      <section className="py-16 md:py-24 bg-secondary">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="bg-gradient-to-r from-[#3532EA] to-[#0EA5FF] rounded-2xl p-8 md:p-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Sua família merece o melhor cuidado, sem pesar no bolso!
            </h2>
            <p className="text-white/90 text-lg mb-8 max-w-3xl mx-auto">
              Com o Cartão DMI, você tem acesso a consultas, exames e procedimentos com até 50% de desconto. Chega de burocracia e longas esperas!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/cadastro">
                <Button size="lg" variant="secondary" className="text-base px-8 gap-2 text-[#3532EA] hover:text-[#3532EA]/80">
                  Fazer Pré-Cadastro Agora <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section id="depoimentos" className="py-16 md:py-24">
        <div className="container max-w-6xl mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto bg-card rounded-2xl p-8 shadow-md border border-border">
            <div className="flex justify-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-[#0EA5FF] text-[#0EA5FF]" />
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

      {/* Footer */}
      <footer className="bg-secondary py-10">
        <div className="container max-w-6xl mx-auto px-4 text-muted-foreground">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Col 1: Logo & About */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <img src={logoDmi} alt="Cartão DMI" className="w-8 h-8 object-contain brightness-200" />
                <span className="font-bold text-foreground">Cartão DMI</span>
              </div>
              <p className="text-xs">
                A REDEDMI é um ecossistema que integra soluções de saúde acessível e de qualidade no interior de
                Pernambuco.
              </p>
            </div>

            {/* Col 2: Contact */}
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground">Contato</h4>
              <div className="text-sm space-y-2">
                <p className="flex items-center gap-2"><MapPin className="w-4 h-4 flex-shrink-0" /> Av. Geminiano Maciel, 400 A, Boa Vista - Belo Jardim, PE</p>
                <a href="mailto:cartaodmi@rededmi.com.br" className="flex items-center gap-2 hover:text-foreground"><Mail className="w-4 h-4" /> cartaodmi@rededmi.com.br</a>
                <a href="tel:8137262899" className="flex items-center gap-2 hover:text-foreground"><Phone className="w-4 h-4" /> (81) 3726-2899</a>
              </div>
            </div>

            {/* Col 3: Social & Hours */}
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground">Atendimento</h4>
              <div className="text-sm space-y-1">
                <p>Seg - Sexta: 7:00 – 18:00</p>
                <p>Sábado: 7:30 – 12:00</p>
              </div>
              <div className="flex gap-3 pt-2">
                <a href="#" className="hover:text-foreground"><Instagram className="w-5 h-5" /></a>
                {/* Add other social links here */}
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-border text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
            <p>© 2026 REDEDMI. Todos os direitos reservados.</p>
            <Link to="/admin/login" className="text-xs hover:text-foreground underline opacity-70 hover:opacity-100 transition-opacity">
              Área Administrativa
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

function BenefitItem({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center space-y-3">
      <div className="w-16 h-16 rounded-full bg-[#0EA5FF]/10 flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs">{description}</p>
    </div>
  );
}

export default LandingPage;
