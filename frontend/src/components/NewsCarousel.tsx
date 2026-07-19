// src/components/NewsCarousel.tsx
import { useState } from "react";

const newsItems = [
  {
    title: "CIET Annual Tech Fest 2024",
    description: "Showcasing innovative projects from students across all departments.",
    image: "https://via.placeholder.com/600x300?text=Tech+Fest+2024",
  },
  {
    title: "New NBA Accredited Program",
    description: "Computer Science Engineering now NBA accredited for the 2024 batch.",
    image: "https://via.placeholder.com/600x300?text=NBA+Accredited",
  },
  {
    title: "Research Publication Highlight",
    description: "Faculty published a paper in IEEE Transactions on Emerging Topics.",
    image: "https://via.placeholder.com/600x300?text=Research+Publication",
  },
];

export default function NewsCarousel() {
  const [index, setIndex] = useState(0);
  const next = () => setIndex((i) => (i + 1) % newsItems.length);
  const prev = () => setIndex((i) => (i - 1 + newsItems.length) % newsItems.length);

  const { title, description, image } = newsItems[index];

  return (
    <div className="news-carousel" style={{ position: "relative", overflow: "hidden" }}>
      <img src={image} alt={title} style={{ width: "100%", borderRadius: "8px" }} />
      <div className="caption" style={{ position: "absolute", bottom: "10px", left: "10px", color: "white", backgroundColor: "rgba(0,0,0,0.5)", padding: "8px", borderRadius: "4px" }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        <p style={{ margin: 0, fontSize: "0.9rem" }}>{description}</p>
      </div>
      <button onClick={prev} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.3)", color: "white", border: "none", borderRadius: "50%", width: "30px", height: "30px" }}>‹</button>
      <button onClick={next} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.3)", color: "white", border: "none", borderRadius: "50%", width: "30px", height: "30px" }}>›</button>
    </div>
  );
}
