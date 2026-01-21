import { collection, doc, setDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
  category?: string;
}

export const faqs: FAQ[] = [
  {
    id: "tech-stack",
    question: "What technologies do you primarily work with?",
    answer:
      "I primarily work with Next.js and React for frontend development, and Python with Django for backend services. I also have experience with Node.js, Java, and C++ for backend and system-level components, depending on performance and architectural requirements.",
    keywords: ["tech stack", "next.js", "django", "backend", "frontend"],
    category: "Technology",
  },
  {
    id: "backend-experience",
    question: "What kind of backend systems have you built?",
    answer:
      "I have built RESTful APIs, data processing pipelines, authentication systems, and third-party integrations. My backend work focuses on scalability, data integrity, performance optimization, and clean architecture in production environments.",
    keywords: ["backend", "api", "data processing", "scalability"],
    category: "Backend",
  },
  {
    id: "frontend-experience",
    question: "Do you have experience with modern frontend frameworks?",
    answer:
      "Yes, I use Next.js to build fast, SEO-friendly frontend applications with server-side rendering, modern React patterns, and clean component structures. I focus on performance, maintainability, and user experience.",
    keywords: ["frontend", "next.js", "react", "ssr"],
    category: "Frontend",
  },
  {
    id: "aws-experience",
    question: "Do you have experience working with AWS?",
    answer:
      "Yes, I have hands-on experience deploying and maintaining applications on AWS, including EC2, S3, RDS, and CloudWatch. I have also worked with CI/CD pipelines and monitoring to ensure system reliability and smooth releases.",
    keywords: ["aws", "ec2", "s3", "rds", "cloud"],
    category: "Cloud",
  },
  {
    id: "git-workflow",
    question: "How do you use Git in your daily workflow?",
    answer:
      "I use Git daily for version control, following structured branching strategies and collaborating through pull requests and code reviews. I prioritize clean commit histories and clear communication within the team.",
    keywords: ["git", "version control", "code review"],
    category: "Workflow",
  },
  {
    id: "java-cpp",
    question: "What is your experience with Java and C++?",
    answer:
      "I have experience working with Java for backend services and C++ for performance-critical components. This background has strengthened my understanding of system design, memory management, and efficient multithreaded processing.",
    keywords: ["java", "c++", "performance", "systems"],
    category: "Backend",
  },
  {
    id: "startup-experience",
    question: "Do you have experience working with startups?",
    answer:
      "Yes, I have worked with startups at different stages, from MVP to scaling products. I'm comfortable taking ownership, working in fast-changing environments, and delivering production-ready solutions under tight timelines.",
    keywords: ["startup", "mvp", "scaling", "ownership"],
    category: "Experience",
  },
  {
    id: "problem-solving",
    question: "How do you approach complex technical problems?",
    answer:
      "I start by understanding the root cause through debugging and data analysis, then design solutions that balance performance, maintainability, and long-term scalability. I value clear communication and incremental improvements.",
    keywords: ["problem solving", "debugging", "architecture"],
    category: "Process",
  },
];

// Function to seed FAQs into Firebase
export const seedFAQs = async (): Promise<void> => {
  try {
    console.log('Starting to seed FAQs...');
    
    // Check existing FAQs to avoid duplicates
    const existingSnapshot = await getDocs(collection(db, 'faqs'));
    const existingIds = new Set(existingSnapshot.docs.map(doc => doc.id));
    
    let added = 0;
    let skipped = 0;
    
    for (const faq of faqs) {
      if (existingIds.has(faq.id)) {
        console.log(`FAQ "${faq.id}" already exists, skipping...`);
        skipped++;
        continue;
      }
      
      // Use setDoc with the FAQ id as the document ID
      await setDoc(doc(db, 'faqs', faq.id), {
        question: faq.question,
        answer: faq.answer,
        keywords: faq.keywords,
        category: faq.category || null,
      });
      
      console.log(`✓ Added FAQ: "${faq.question}"`);
      added++;
    }
    
    console.log(`\n✅ Seeding complete!`);
    console.log(`   Added: ${added} FAQs`);
    console.log(`   Skipped: ${skipped} existing FAQs`);
    console.log(`   Total: ${faqs.length} FAQs`);
  } catch (error) {
    console.error('Error seeding FAQs:', error);
    throw error;
  }
};

// Run if executed directly
if (import.meta.hot) {
  // In development, expose the function globally for easy access
  (window as any).seedFAQs = seedFAQs;
}
