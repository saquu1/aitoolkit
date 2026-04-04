import { useToast } from "@/hooks/use-toast"

export function useActionToast() {
  const { toast } = useToast()

  return {
    success: (title: string, description?: string) => {
      toast({
        title: `✅ ${title}`,
        description,
      })
    },

    error: (title: string, description?: string) => {
      toast({
        title: `❌ ${title}`,
        description,
        variant: "destructive",
      })
    },

    info: (title: string, description?: string) => {
      toast({
        title: `ℹ️ ${title}`,
        description,
      })
    },

    warning: (title: string, description?: string) => {
      toast({
        title: `⚠️ ${title}`,
        description,
      })
    },

    navigate: (pageName: string) => {
      toast({
        title: `🧭 Navigated to ${pageName}`,
      })
    },

    dataLoaded: (count: number, type: string) => {
      toast({
        title: `✅ ${count} ${type} loaded successfully`,
      })
    },

    settingsSaved: (settingName?: string) => {
      toast({
        title: settingName
          ? `✅ Settings saved: ${settingName}`
          : `✅ Settings saved`,
      })
    },

    custom: (
      title: string,
      description?: string,
      variant?: "default" | "destructive"
    ) => {
      toast({
        title,
        description,
        variant,
      })
    },
  }
}
