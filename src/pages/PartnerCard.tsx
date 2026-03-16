import './PartnerCard.css';

interface PartnerCardProps {
  name: string;
  description: string;
  logo: string;
  discount: string;
  link?: string;
}

export const PartnerCard = ({ name, description, logo, discount, link }: PartnerCardProps) => {
  return (
    <div className="partner-card shadow-lg">
      <img src={logo} alt={name} />
      <section>
        <h2>{name}</h2>
        <p>{description}</p>
        <div>
          <div className="tag">
            {discount}
          </div>
          <button onClick={() => { if (link) window.open(link, "_blank"); }}>
            Conhecer
          </button>
        </div>
      </section>
    </div>
  );
};