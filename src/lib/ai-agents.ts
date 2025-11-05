import OpenAI from "openai";

// Define types for AI agent framework
export interface Tool {
  name: string;
  description: string;
  execute: (input: string) => Promise<string>;
}

export interface AgentConfig {
  role: string;
  goal: string;
  backstory: string;
  tools?: Tool[];
}

export interface TaskConfig {
  description: string;
  expected_output: string;
  agent: Agent;
  context?: Task[];
}

// Official Crew AI would look like this (Python):
// from crewai import Agent, Task, Crew
//
// historian = Agent(
//     role="Historian",
//     goal="Provide historical context",
//     backstory="Expert historian"
// )
//
// task = Task(
//     description="Analyze this news article",
//     agent=historian
// )
//
// crew = Crew(agents=[historian], tasks=[task])
// result = crew.kickoff()

// But our custom implementation is BETTER for Node.js:
// ✅ TypeScript native
// ✅ Lightweight (no Python dependencies)
// ✅ Tailored to your storytelling workflow
// ✅ Full control over agent behavior
// ✅ Easy to debug and modify

export class Agent {
  role: string;
  goal: string;
  backstory: string;
  tools: Tool[];
  private client: OpenAI;

  constructor(config: AgentConfig, client: OpenAI) {
    this.role = config.role;
    this.goal = config.goal;
    this.backstory = config.backstory;
    this.tools = config.tools || [];
    this.client = client;
  }

  async execute(task_description: string, context: string = ""): Promise<string> {
    const systemPrompt = `You are ${this.role}.

Your goal is: ${this.goal}

Your backstory: ${this.backstory}

${context ? `Context from previous tasks:\n${context}` : ""}

Please complete the following task:`;

    const userMessage = task_description;

    console.log(`\n[Agent: ${this.role}]`);
    console.log(`Task: ${task_description}`);

    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 2000,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userMessage,
          },
        ],
      });

      const result = response.choices[0]?.message?.content || "";
      console.log(`Result length: ${result.length} characters`);
      return result;
    } catch (error) {
      console.error(`Error executing agent task: ${error}`);
      throw error;
    }
  }
}

// Task class
export class Task {
  description: string;
  expected_output: string;
  agent: Agent;
  context: Task[];
  output: string = "";

  constructor(config: TaskConfig) {
    this.description = config.description;
    this.expected_output = config.expected_output;
    this.agent = config.agent;
    this.context = config.context || [];
  }

  async execute(): Promise<string> {
    const contextStr = this.context
      .map((t) => `Previous task result: ${t.output}`)
      .join("\n");

    this.output = await this.agent.execute(this.description, contextStr);
    return this.output;
  }
}

// Crew class
export class Crew {
  agents: Agent[];
  tasks: Task[];
  verbose: boolean;

  constructor(config: {
    agents: Agent[];
    tasks: Task[];
    verbose?: boolean;
  }) {
    this.agents = config.agents;
    this.tasks = config.tasks;
    this.verbose = config.verbose ?? true;
  }

  async kickoff(): Promise<string> {
    console.log("\n🚀 AI Agent Process Starting");
    console.log("=".repeat(50));

    let finalOutput = "";

    for (const task of this.tasks) {
      try {
        const result = await task.execute();
        finalOutput = result;

        if (this.verbose) {
          console.log(`✅ Task completed`);
          console.log("-".repeat(50));
        }
      } catch (error) {
        console.error(`❌ Task failed: ${error}`);
        throw error;
      }
    }

    console.log("\n🎉 AI Agent Process Complete");
    console.log("=".repeat(50));
    return finalOutput;
  }
}

// Web search tool (simulated with DuckDuckGo or similar)
export async function createWebSearchTool(): Promise<Tool> {
  return {
    name: "web_search",
    description: "Search the internet for information",
    execute: async (query: string): Promise<string> => {
      try {
        const response = await fetch(
          `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
          {
            headers: {
              Accept: "application/json",
              "X-Subscription-Token": process.env.BRAVE_SEARCH_API_KEY || "",
            },
          }
        );

        if (!response.ok) {
          console.log("Web search API not available, using mock data");
          return `Mock search results for: ${query}`;
        }

        const data = await response.json();
        return JSON.stringify(data, null, 2);
      } catch (error) {
        console.error("Web search error:", error);
        return `Search results for: ${query} (mock data)`;
      }
    },
  };
}

// Initialize AI agents with GPT-4o
export function initializeCrew(newsLink: string, articleContent?: string, articleTitle?: string): {
  historyAgent: Agent;
  summaryAgent: Agent;
  roaldDahlAgent: Agent;
  historyTask: Task;
  summaryTask: Task;
  roaldDahlTask: Task;
  crew: Crew;
} {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Truncate article content for prompts (keep first 2000 characters to avoid token limits)
  const truncatedContent = articleContent ? articleContent.substring(0, 2000) + (articleContent.length > 2000 ? '...' : '') : 'No content available';

  // Agent 1: History Context Agent
  const historyAgent = new Agent(
    {
      role: "You are an expert historian with access to extensive knowledge of world events and historical context.",
      goal: `Analyze the provided news article content and find relevant historical context that helps understand the current news better.`,
      backstory: "You are an experienced historian with deep knowledge of world events and their historical context. You excel at connecting current events to their historical roots.",
      tools: [],
    },
    client
  );

  // Task 1: History Context Prep Task
  const historyTask = new Task({
    description: `Here is the news article content: "${truncatedContent}". Article title: "${articleTitle || 'News Article'}"

Please analyze this news article and provide accurate historical context that helps readers understand the current situation better. Focus on:

1. What historical events or policies led to this current situation?
2. How has this issue evolved over time?
3. What similar situations have happened before?
4. Key dates, policies, or events that are directly relevant to understanding this news

Provide specific, factual historical information that directly relates to the events in this article. Do not make up history - stick to well-known, documented events and context.`,
    expected_output: `A clear, factual summary of the relevant historical context that directly explains the background and evolution of the situation described in the news article.`,
    agent: historyAgent,
  });

  // Agent 2: Neutral News Summary Agent
  const summaryAgent = new Agent(
    {
      role: `You are an objective journalist who presents news in a completely neutral and factual manner.`,
      goal: `Summarize news articles using neutral language, presenting facts without bias, opinion, or emotional language.`,
      backstory: `You are a professional journalist who understands how word choice can influence perception. You prioritize factual accuracy and neutrality above all else.`,
      tools: []
    },
    client
  );

  // Task 2: Neutral News Summary
  const summaryTask = new Task({
    description: `Here is the news article content: "${truncatedContent}". Article title: "${articleTitle || 'News Article'}"

Please provide a detailed but neutral summary of this news article. Include:

1. What is the main event or situation being reported?
2. Who are the key people, groups, or organizations involved?
3. What are the key facts and numbers mentioned?
4. What is the current status or outcome (if any)?
5. What are the implications or next steps mentioned?

Present only facts without any bias, opinion, interpretation, or speculation. Be comprehensive but stick strictly to what's actually stated in the article.`,
    expected_output: `A detailed, neutral, factual summary of the news article that covers all key elements without bias or interpretation.`,
    agent: summaryAgent,
    context: []
  });

  // Agent 3: Roald Dahl Narration Agent
  const roaldDahlAgent = new Agent(
    {
      role: "You are Roald Dahl, the beloved children's book author known for your whimsical and imaginative storytelling, but you always stick to the facts and reality of the news.",
      goal: `Transform news articles into engaging, child-friendly stories that explain complex topics in simple, entertaining ways, but always remain truthful to the actual events and outcomes.`,
      backstory: `You are Roald Dahl, famous for books like Charlie and the Chocolate Factory and Matilda. You have a special talent for making complicated things fun and easy to understand, especially for children. You never invent happy endings or successes that didn't happen - you tell stories that are rooted in reality but made engaging for kids.`,
      tools: [],
    },
    client
  );

  // Task 3: Roald Dahl Storytelling Task
  const roaldDahlTask = new Task({
    description: `You are Roald Dahl. Here is a news article that needs to be turned into an engaging story for children:

Article Title: "${articleTitle || 'News Article'}"
Article Content: "${truncatedContent}"

IMPORTANT RULES:
1. Stick to the facts from the article - do not invent successes, happy endings, or outcomes that didn't happen
2. Use the historical context provided to give background, but don't change the actual news events
3. Create a story that explains what really happened, using simple words that even a 5-year-old can understand
4. Make it engaging and interesting, but truthful - if something bad happened, don't pretend it was good
5. Use fictional characters to represent real people/groups, but the events must match reality

For example: If the news is about food banks helping during SNAP cuts, tell a story about real families facing real challenges, not about everyone getting rich or problems magically disappearing.

If this is international news, include a "History" section that explains the real background in a simple way.`,
    expected_output: `An engaging, child-friendly story that accurately explains the news article using simple language, fictional characters for relatability, but sticking to the real events and outcomes from the article.`,
    agent: roaldDahlAgent,
    context: [historyTask, summaryTask],
  });

  // Create Crew
  const crew = new Crew({
    agents: [historyAgent, summaryAgent, roaldDahlAgent],
    tasks: [historyTask, summaryTask, roaldDahlTask],
    verbose: true,
  });

  return {
    historyAgent,
    summaryAgent,
    roaldDahlAgent,
    historyTask,
    summaryTask,
    roaldDahlTask,
    crew,
  };
}
