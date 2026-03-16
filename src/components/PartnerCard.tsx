import { useState } from 'react';
import '@/components/landing/PartnerCard.css';

interface PartnerCardProps {
  name: string;
  description: string;
  logo: string;
  discount: string;
}

export const PartnerCard = ({ name, description, logo, discount }: PartnerCardProps) => {
  const [following, setFollowing] = useState(false);

  const handleFollow = () => {
    setFollowing(!following);
  };

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
          <button onClick={handleFollow} className={following ? "following" : ""}>
            {following ? "Salvo" : "Conhecer"}
          </button>
        </div>
      </section>
    </div>
  );
};