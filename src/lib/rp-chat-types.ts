export type RpClientMessage = {
  id: string;
  role: "user" | "character" | "system";
  content: string;
};

export type SendRpRequest = {
  companionId: string;
  message: string;
  messages: RpClientMessage[];
};
