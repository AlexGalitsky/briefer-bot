export interface SummaryTask {
  title: string;
  assignee?: string | null;
  dueDate?: string | null;
}

export interface GenerateSummaryResult {
  summaryMarkdown: string;
  tasks: SummaryTask[];
  model: string;
  processingTimeSec: number;
}
