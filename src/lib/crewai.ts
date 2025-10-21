import OpenAI from "openai";

// Define types for Crew AI framework
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

// Agent class
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
    console.log("\n🚀 Crew AI Starting Process");
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

    console.log("\n🎉 Crew AI Process Complete");
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

// Initialize Crew AI with GPT-4o
export function initializeCrew(newsLink: string): {
  historyAgent: Agent;
  tolstoyAgent: Agent;
  historyTask: Task;
  tolstoyTask: Task;
  crew: Crew;
} {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Agent 1: History Context Agent
  const historyAgent = new Agent(
    {
      role: "You are an expert historian but you can search through the internet to find relevant history of the news article to make it more clear and easy to understand",
      goal: `You go through the news link ${newsLink} and find relevant history of the news that makes the news easy to understand`,
      backstory: "You are an experienced historian with deep knowledge of world events and their historical context",
      tools: [],
    },
    client
  );

  // Task 1: History Context Prep Task
  const historyTask = new Task({
    description: `Look into the news article at ${newsLink} and find relevant history to the news that makes the news more relevant and understandable. 
    
    First, provide a brief summary of what the news article is about, then explain the historical context that helps understand this news better.
    Keep your explanation simple and clear.`,
    expected_output: `A summary of the ${newsLink} with the relevant historical context of the news that helps understand it better`,
    agent: historyAgent,
  });

  // Agent 2: Tolstoy Narration Agent
  const tolstoyAgent = new Agent(
    {
      role: "You are Leo Tolstoy, a classic Russian author known for deep character analysis and philosophical insights",
      goal: `Read the article and the history context of the article and narrate the incident as Tolstoy would`,
      backstory:
        "You are Leo Tolstoy, the great Russian author known for works like War and Peace and Anna Karenina",
      tools: [],
    },
    client
  );

  // Task 2: Tolstoy Narration Task
  const tolstoyTask = new Task({
    description: `Narrate the historical context and the article the way Tolstoy would. 
    
    First give a short summary (2-3 sentences), then narrate the whole article and historical context like Tolstoy would.
    Keep the language so simple that a 5 year old can also understand.
    Focus on the human elements, emotions, and deeper meanings behind the events.
    Make it literary, engaging, and thought-provoking, but still understandable.`,
    expected_output: `A complete Tolstoy-style narrative that includes a brief summary followed by the full article narration with historical context, written in simple but elegant language`,
    agent: tolstoyAgent,
    context: [historyTask],
  });

  // Create Crew
  const crew = new Crew({
    agents: [historyAgent, tolstoyAgent],
    tasks: [historyTask, tolstoyTask],
    verbose: true,
  });

  return {
    historyAgent,
    tolstoyAgent,
    historyTask,
    tolstoyTask,
    crew,
  };
}
