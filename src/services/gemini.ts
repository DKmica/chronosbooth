import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeImage = async (base64Image: string): Promise<string> => {
  const ai = getAI();
  const response: GenerateContentResponse = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Image.split(",")[1] || base64Image,
          },
        },
        {
          text: "Analyze this person's appearance, expression, and clothing. Describe them in detail so I can use this description to place them in a historical scene. Keep the description concise but descriptive.",
        },
      ],
    },
  });
  return response.text || "No analysis available.";
};

export const transformToEra = async (
  base64Image: string,
  eraDescription: string,
  userPrompt?: string
): Promise<string | null> => {
  const ai = getAI();
  const prompt = userPrompt 
    ? `Edit this image based on this request: ${userPrompt}. Maintain the person's facial features but adapt them to the scene.`
    : `Place the person in this photo into a highly detailed historical scene: ${eraDescription}. Ensure their face is clearly visible and naturally integrated into the scene. The person should be wearing era-appropriate clothing.`;

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Image.split(",")[1] || base64Image,
          },
        },
        {
          text: prompt,
        },
      ],
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }

  return null;
};

export const ERAS = [
  {
    id: "egypt",
    name: "Ancient Egypt",
    description: "A majestic scene in Ancient Egypt, with the Great Pyramids and Sphinx in the background under a golden sun. The person is dressed as a noble or pharaoh with ornate gold jewelry and linen robes.",
    image: "https://picsum.photos/seed/egypt/800/600"
  },
  {
    id: "renaissance",
    name: "Renaissance Italy",
    description: "A lush balcony overlooking 15th-century Florence. The person is dressed in rich velvet garments, holding a quill or a lute, in the style of a Da Vinci portrait.",
    image: "https://picsum.photos/seed/renaissance/800/600"
  },
  {
    id: "victorian",
    name: "Victorian London",
    description: "A foggy street in Victorian London with gas lamps and horse-drawn carriages. The person is wearing a sophisticated top hat or a detailed corset dress with lace.",
    image: "https://picsum.photos/seed/victorian/800/600"
  },
  {
    id: "cyberpunk",
    name: "Neon Future",
    description: "A rain-slicked cyberpunk city street with towering neon signs and flying vehicles. The person has subtle cybernetic enhancements and high-tech streetwear.",
    image: "https://picsum.photos/seed/cyberpunk/800/600"
  },
  {
    id: "samurai",
    name: "Feudal Japan",
    description: "A serene cherry blossom garden with a traditional pagoda. The person is dressed in intricate samurai armor or a beautiful silk kimono.",
    image: "https://picsum.photos/seed/samurai/800/600"
  },
  {
    id: "roaring20s",
    name: "Roaring 20s",
    description: "A vibrant jazz club in the 1920s. The person is dressed in a sharp tuxedo or a flapper dress with sequins and feathers, surrounded by Art Deco decor.",
    image: "https://picsum.photos/seed/jazz/800/600"
  },
  {
    id: "viking",
    name: "Viking Age",
    description: "A rugged Nordic fjord during the Viking Age, with majestic longships anchored in the misty water and snow-capped mountains in the distance. The person is dressed in authentic Viking attire, featuring thick furs, leather tunics, and intricate iron jewelry, looking like a brave explorer.",
    image: "https://picsum.photos/seed/viking/800/600"
  },
  {
    id: "maya",
    name: "Ancient Maya",
    description: "A lush, vibrant jungle in the heart of the Mayan civilization, with a towering stone step-pyramid rising above the canopy. The person is adorned in ceremonial Mayan regalia, including a magnificent feathered headdress, jade necklaces, and colorful woven textiles.",
    image: "https://picsum.photos/seed/maya/800/600"
  },
  {
    id: "wildwest",
    name: "Wild West",
    description: "A dusty frontier town in the American Wild West during the late 19th century, with wooden saloons and hitching posts along a dirt road. The person is dressed as a classic gunslinger or pioneer, wearing a weathered leather duster, a wide-brimmed Stetson hat, and rugged denim.",
    image: "https://picsum.photos/seed/wildwest/800/600"
  },
  {
    id: "greece",
    name: "Ancient Greece",
    description: "The sun-drenched Acropolis of Athens with white marble columns and olive trees. The person is wearing a flowing white chiton with gold embroidery and a laurel wreath.",
    image: "https://picsum.photos/seed/greece/800/600"
  },
  {
    id: "pirate",
    name: "Age of Piracy",
    description: "A tropical Caribbean cove with a massive wooden galleon anchored nearby. The person is dressed as a pirate captain with a tricorn hat, leather boots, and a weathered coat.",
    image: "https://picsum.photos/seed/pirate/800/600"
  },
  {
    id: "medieval",
    name: "Medieval Knight",
    description: "A grand stone castle courtyard during a tournament. The person is wearing shining plate armor with a colorful surcoat and holding a ceremonial sword.",
    image: "https://picsum.photos/seed/knight/800/600"
  },
  {
    id: "spaceage",
    name: "Retro Space Age",
    description: "A 1950s vision of the future on a moon base. The person is wearing a silver jumpsuit with bubble helmet, surrounded by analog computers and sleek rockets.",
    image: "https://picsum.photos/seed/space/800/600"
  },
  {
    id: "woodstock",
    name: "1960s Psychedelia",
    description: "A vibrant music festival field with colorful vans and peace signs. The person is wearing tie-dye clothing, round sunglasses, and a headband.",
    image: "https://picsum.photos/seed/hippie/800/600"
  },
  {
    id: "prehistoric",
    name: "Prehistoric Era",
    description: "A prehistoric landscape with massive ferns and a distant volcano. The person is dressed in primitive furs and carrying a stone tool, in a cinematic dawn-of-man style.",
    image: "https://picsum.photos/seed/caveman/800/600"
  }
];
