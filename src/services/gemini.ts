import { GoogleGenAI } from "@google/genai";

const ANALYSIS_MODEL = "gemini-1.5-pro"; 
const TRANSFORMATION_MODEL = "gemini-1.5-flash";

declare global {
  interface Window {
    ChronosAndroid?: {
      analyzeImage: (base64: string, callbackId: string) => void;
      transformToEra: (base64: string, era: string, callbackId: string) => void;
    };
    onAnalysisResult?: (id: string, result: string) => void;
    onTransformationResult?: (id: string, result: string) => void;
  }
}

const getAI = () => {
  // Vite environment variables check
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY;
  return apiKey ? new GoogleGenAI(apiKey) : null;
};

export const analyzeImage = async (base64Image: string): Promise<string> => {
  // --- ANDROID BRIDGE PATH ---
  if (window.ChronosAndroid) {
    return new Promise((resolve) => {
      const callbackId = `analyze_${Date.now()}`;
      
      // Register listener IMMEDIATELY before calling native code
      window.onAnalysisResult = (id: string, result: string) => {
        if (id === callbackId) {
          console.log("Analysis result received from Android");
          resolve(result);
        }
      };

      try {
        window.ChronosAndroid.analyzeImage(base64Image, callbackId);
      } catch (err) {
        console.error("Android bridge call failed", err);
        resolve("Bridge connection error.");
      }
    });
  }

  // --- WEB FALLBACK PATH ---
  const ai = getAI();
  if (!ai) return "API Key not configured.";

  try {
    const model = ai.getGenerativeModel({ model: ANALYSIS_MODEL });
    const result = await model.generateContent([
      "Analyze this person in detail: facial structure, expression, hair, and clothing. Return a rich identity description optimized for likeness preservation.",
      { inlineData: { mimeType: "image/jpeg", data: base64Image.split(",")[1] || base64Image } }
    ]);
    return result.response.text();
  } catch (error) {
    console.error("Web analysis failed", error);
    return "Analysis unavailable in browser.";
  }
};

export const transformToEra = async (
  originalImage: string,
  prompt: string,
  customPrompt?: string,
  subjectAnalysis?: string
): Promise<string | null> => {
  const finalPrompt = customPrompt || prompt;

  // --- ANDROID BRIDGE PATH ---
  if (window.ChronosAndroid) {
    return new Promise((resolve) => {
      const callbackId = `transform_${Date.now()}`;
      
      window.onTransformationResult = (id: string, result: string) => {
        if (id === callbackId) {
          console.log("Transformation result received from Android");
          // Android bridge sends back the base64 or description string
          resolve(result);
        }
      };

      window.ChronosAndroid.transformToEra(originalImage, finalPrompt, callbackId);
    });
  }

  // --- WEB FALLBACK PATH ---
  const ai = getAI();
  if (!ai) return originalImage;

  try {
    const model = ai.getGenerativeModel({ model: TRANSFORMATION_MODEL });
    const fullTextPrompt = `Transform this portrait: ${finalPrompt}. Identity Analysis: ${subjectAnalysis}. Keep face structure, change clothing and background to match the era.`;
    
    const result = await model.generateContent([
      fullTextPrompt,
      { inlineData: { mimeType: "image/jpeg", data: originalImage.split(",")[1] || originalImage } }
    ]);
    return result.response.text(); 
  } catch (error) {
    console.error("Web transformation failed", error);
    return originalImage;
  }
};

// ERAS list remains exactly as you had it to ensure the UI populates
export const ERAS = [
  { id: 'egypt', name: 'Ancient Egypt', description: 'A majestic scene in Ancient Egypt, with the Great Pyramids and Sphinx in the background. The person is a noble or pharaoh with ornate gold jewelry.', image: 'https://picsum.photos/seed/egypt/800/600' },
  { id: 'renaissance', name: 'Renaissance Italy', description: 'A lush balcony in 15th-century Florence. Dressed in rich velvet garments in the style of a Da Vinci portrait.', image: 'https://picsum.photos/seed/renaissance/800/600' },
  { id: 'victorian', name: 'Victorian London', description: 'A foggy street with gas lamps. Wearing a sophisticated top hat or a detailed corset dress.', image: 'https://picsum.photos/seed/victorian/800/600' },
  { id: 'cyberpunk', name: 'Neon Future', description: 'A rain-slicked cyberpunk street with towering neon signs. High-tech streetwear and cybernetic enhancements.', image: 'https://picsum.photos/seed/cyberpunk/800/600' },
  { id: 'samurai', name: 'Feudal Japan', description: 'A serene cherry blossom garden with a traditional pagoda. Dressed in samurai armor or a silk kimono.', image: 'https://picsum.photos/seed/samurai/800/600' },
  { id: 'roaring20s', name: 'Roaring 20s', description: 'A vibrant jazz club. Dressed in a sharp tuxedo or a flapper dress with sequins and feathers.', image: 'https://picsum.photos/seed/jazz/800/600' },
  { id: 'viking', name: 'Viking Age', description: 'A rugged Nordic fjord with majestic longships. Dressed in thick furs, leather tunics, and iron jewelry.', image: 'https://picsum.photos/seed/viking/800/600' },
  { id: 'maya', name: 'Ancient Maya', description: 'A lush jungle with stone pyramids. Adorned in ceremonial regalia with a feathered headdress and jade.', image: 'https://picsum.photos/seed/maya/800/600' },
  { id: 'wildwest', name: 'Wild West', description: 'A dusty frontier town. Dressed as a gunslinger with a leather duster and Stetson hat.', image: 'https://picsum.photos/seed/wildwest/800/600' },
  { id: 'greece', name: 'Ancient Greece', description: 'The sun-drenched Acropolis. Wearing a white chiton with gold embroidery and a laurel wreath.', image: 'https://picsum.photos/seed/greece/800/600' },
  { id: 'pirate', name: 'Age of Piracy', description: 'A Caribbean cove with a wooden galleon. Dressed as a pirate captain with a tricorn hat.', image: 'https://picsum.photos/seed/pirate/800/600' },
  { id: 'medieval', name: 'Medieval Knight', description: 'A stone castle courtyard. Wearing shining plate armor and holding a ceremonial sword.', image: 'https://picsum.photos/seed/knight/800/600' },
  { id: 'spaceage', name: 'Retro Space Age', description: 'A 1950s vision of a moon base. Wearing a silver jumpsuit with a bubble helmet.', image: 'https://picsum.photos/seed/space/800/600' },
  { id: 'woodstock', name: '1960s Psychedelia', description: 'A music festival with colorful vans. Wearing tie-dye and round sunglasses.', image: 'https://picsum.photos/seed/hippie/800/600' },
  { id: 'prehistoric', name: 'Prehistoric Era', description: 'A prehistoric landscape with ferns and a volcano. Dressed in primitive furs.', image: 'https://picsum.photos/seed/caveman/800/600' },
  { id: 'noir', name: 'Film Noir', description: 'A shadowy detective office in 1940s LA. Dressed in a trench coat and fedora.', image: 'https://picsum.photos/seed/noir/800/600' },
  { id: 'steampunk', name: 'Steampunk Workshop', description: 'A workshop filled with brass gears. Wearing goggles and a leather apron.', image: 'https://picsum.photos/seed/steampunk/800/600' },
  { id: 'atlantis', name: 'Lost City of Atlantis', description: 'An underwater city ruins. Garments made of sea silk, pearls, and coral.', image: 'https://picsum.photos/seed/atlantis/800/600' },
  { id: 'mars', name: 'Mars Colony 2150', description: 'A futuristic colony on the red planet. Wearing a high-tech spacesuit.', image: 'https://picsum.photos/seed/mars/800/600' },
  { id: 'disco', name: 'Disco Fever', description: 'A 1970s disco dance floor. Wearing a sequined jumpsuit and platform shoes.', image: 'https://picsum.photos/seed/disco/800/600' },
  { id: 'frenchrev', name: 'French Revolution', description: '18th-century Paris streets. Revolutionary attire with a cockade hat.', image: 'https://picsum.photos/seed/revolution/800/600' },
];