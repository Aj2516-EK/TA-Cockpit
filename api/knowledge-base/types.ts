export type KnowledgeBaseCluster =
  | 'readiness'
  | 'momentum'
  | 'experience'
  | 'diversity'
  | 'economics'
  | 'global'

export type KnowledgeBaseDoc = {
  id: string
  title: string
  cluster: KnowledgeBaseCluster
  text: string
  tags?: string[]
}

