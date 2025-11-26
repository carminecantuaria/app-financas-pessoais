"use client"

import { useState } from "react"
import { useDropzone } from "react-dropzone"
import { Upload, TrendingUp, TrendingDown, Wallet, Calendar, Filter, Download } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts"

// Tipos
interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  type: "receita" | "despesa"
  category: string
  source: string
}

interface CategoryData {
  name: string
  value: number
  color: string
}

// Categorias automáticas
const CATEGORIES = {
  receita: {
    salario: ["salario", "salário", "vencimento", "pagamento"],
    freelance: ["freelance", "freela", "projeto", "consultoria"],
    investimento: ["dividendo", "rendimento", "juros", "investimento"],
    outros: ["transferencia", "pix recebido", "deposito"]
  },
  despesa: {
    alimentacao: ["restaurante", "ifood", "rappi", "uber eats", "mercado", "supermercado", "padaria"],
    transporte: ["uber", "99", "gasolina", "combustivel", "estacionamento", "pedagio"],
    moradia: ["aluguel", "condominio", "luz", "agua", "gas", "internet"],
    saude: ["farmacia", "medico", "hospital", "plano de saude", "consulta"],
    educacao: ["escola", "faculdade", "curso", "livro", "udemy"],
    lazer: ["cinema", "netflix", "spotify", "amazon prime", "show", "viagem"],
    compras: ["amazon", "mercado livre", "magazine", "loja", "shopping"],
    outros: ["saque", "transferencia", "pix enviado"]
  }
}

const CATEGORY_COLORS: Record<string, string> = {
  salario: "#10b981",
  freelance: "#3b82f6",
  investimento: "#8b5cf6",
  alimentacao: "#ef4444",
  transporte: "#f59e0b",
  moradia: "#06b6d4",
  saude: "#ec4899",
  educacao: "#6366f1",
  lazer: "#14b8a6",
  compras: "#f97316",
  outros: "#64748b"
}

export default function FinancasApp() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filterMonth, setFilterMonth] = useState<string>("todos")
  const [filterCategory, setFilterCategory] = useState<string>("todas")

  // Categorização automática
  const categorizeTransaction = (description: string, amount: number): { type: "receita" | "despesa", category: string } => {
    const desc = description.toLowerCase()
    const isPositive = amount > 0

    if (isPositive) {
      for (const [category, keywords] of Object.entries(CATEGORIES.receita)) {
        if (keywords.some(keyword => desc.includes(keyword))) {
          return { type: "receita", category }
        }
      }
      return { type: "receita", category: "outros" }
    } else {
      for (const [category, keywords] of Object.entries(CATEGORIES.despesa)) {
        if (keywords.some(keyword => desc.includes(keyword))) {
          return { type: "despesa", category }
        }
      }
      return { type: "despesa", category: "outros" }
    }
  }

  // Parser de CSV/TXT simulado
  const parseFile = (content: string, fileName: string): Transaction[] => {
    const lines = content.split("\n").filter(line => line.trim())
    const parsed: Transaction[] = []

    lines.forEach((line, index) => {
      // Formato esperado: data;descrição;valor ou data,descrição,valor
      const parts = line.includes(";") ? line.split(";") : line.split(",")
      
      if (parts.length >= 3) {
        const date = parts[0].trim()
        const description = parts[1].trim()
        const amountStr = parts[2].trim().replace("R$", "").replace(".", "").replace(",", ".")
        const amount = parseFloat(amountStr)

        if (!isNaN(amount) && description) {
          const { type, category } = categorizeTransaction(description, amount)
          
          parsed.push({
            id: `${fileName}-${index}-${Date.now()}`,
            date,
            description,
            amount: Math.abs(amount),
            type,
            category,
            source: fileName
          })
        }
      }
    })

    return parsed
  }

  // Upload de arquivos
  const onDrop = (acceptedFiles: File[]) => {
    acceptedFiles.forEach(file => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        const content = e.target?.result as string
        const newTransactions = parseFile(content, file.name)
        setTransactions(prev => [...prev, ...newTransactions])
      }
      
      reader.readAsText(file)
    })
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'text/plain': ['.txt']
    }
  })

  // Cálculos
  const filteredTransactions = transactions.filter(t => {
    const monthMatch = filterMonth === "todos" || t.date.includes(filterMonth)
    const categoryMatch = filterCategory === "todas" || t.category === filterCategory
    return monthMatch && categoryMatch
  })

  const totalReceitas = filteredTransactions
    .filter(t => t.type === "receita")
    .reduce((sum, t) => sum + t.amount, 0)

  const totalDespesas = filteredTransactions
    .filter(t => t.type === "despesa")
    .reduce((sum, t) => sum + t.amount, 0)

  const saldo = totalReceitas - totalDespesas

  // Dados para gráficos
  const categoryData: CategoryData[] = Object.entries(
    filteredTransactions.reduce((acc, t) => {
      if (!acc[t.category]) acc[t.category] = 0
      acc[t.category] += t.amount
      return acc
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({
    name,
    value,
    color: CATEGORY_COLORS[name] || "#64748b"
  }))

  // Histórico mensal
  const monthlyData = filteredTransactions.reduce((acc, t) => {
    const month = t.date.substring(3, 10) // MM/YYYY
    if (!acc[month]) {
      acc[month] = { month, receitas: 0, despesas: 0 }
    }
    if (t.type === "receita") {
      acc[month].receitas += t.amount
    } else {
      acc[month].despesas += t.amount
    }
    return acc
  }, {} as Record<string, { month: string, receitas: number, despesas: number }>)

  const timelineData = Object.values(monthlyData).sort((a, b) => {
    const [monthA, yearA] = a.month.split("/")
    const [monthB, yearB] = b.month.split("/")
    return new Date(`${yearA}-${monthA}`).getTime() - new Date(`${yearB}-${monthB}`).getTime()
  })

  // Meses únicos para filtro
  const uniqueMonths = Array.from(new Set(transactions.map(t => t.date.substring(3, 10)))).sort()

  // Categorias únicas para filtro
  const uniqueCategories = Array.from(new Set(transactions.map(t => t.category)))

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Finanças Pessoais
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Gerencie suas receitas e despesas de forma inteligente
          </p>
        </div>

        {/* Upload Area */}
        {transactions.length === 0 && (
          <Card className="mb-8 border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div
                {...getRootProps()}
                className={`cursor-pointer transition-all duration-300 p-8 sm:p-12 rounded-xl text-center ${
                  isDragActive
                    ? "bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-500"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-slate-400" />
                <h3 className="text-lg sm:text-xl font-semibold mb-2 text-slate-900 dark:text-slate-100">
                  {isDragActive ? "Solte os arquivos aqui" : "Faça upload dos seus extratos"}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Arraste arquivos CSV ou TXT ou clique para selecionar
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-500">
                  Formato esperado: data;descrição;valor (ex: 01/01/2024;Salário;5000.00)
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {transactions.length > 0 && (
          <>
            {/* Upload compacto */}
            <div className="mb-6">
              <div
                {...getRootProps()}
                className="cursor-pointer p-4 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all bg-white dark:bg-slate-900"
              >
                <input {...getInputProps()} />
                <div className="flex items-center justify-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <Upload className="w-4 h-4" />
                  <span>Adicionar mais extratos</span>
                </div>
              </div>
            </div>

            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
              <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Receitas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    R$ {totalReceitas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-emerald-100 text-sm mt-1">
                    {filteredTransactions.filter(t => t.type === "receita").length} transações
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-0 shadow-xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingDown className="w-4 h-4" />
                    Despesas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    R$ {totalDespesas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-red-100 text-sm mt-1">
                    {filteredTransactions.filter(t => t.type === "despesa").length} transações
                  </p>
                </CardContent>
              </Card>

              <Card className={`bg-gradient-to-br ${saldo >= 0 ? "from-blue-500 to-blue-600" : "from-orange-500 to-orange-600"} text-white border-0 shadow-xl sm:col-span-2 lg:col-span-1`}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Wallet className="w-4 h-4" />
                    Saldo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    R$ {saldo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </div>
                  <p className={`${saldo >= 0 ? "text-blue-100" : "text-orange-100"} text-sm mt-1`}>
                    {saldo >= 0 ? "Saldo positivo" : "Saldo negativo"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Filtros */}
            <Card className="mb-6 bg-white dark:bg-slate-900">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-2 block text-slate-700 dark:text-slate-300">
                      <Calendar className="w-4 h-4 inline mr-2" />
                      Período
                    </label>
                    <Select value={filterMonth} onValueChange={setFilterMonth}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos os meses</SelectItem>
                        {uniqueMonths.map(month => (
                          <SelectItem key={month} value={month}>{month}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-1">
                    <label className="text-sm font-medium mb-2 block text-slate-700 dark:text-slate-300">
                      <Filter className="w-4 h-4 inline mr-2" />
                      Categoria
                    </label>
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todas">Todas as categorias</SelectItem>
                        {uniqueCategories.map(cat => (
                          <SelectItem key={cat} value={cat}>
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs com Visualizações */}
            <Tabs defaultValue="dashboard" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="historico">Histórico</TabsTrigger>
                <TabsTrigger value="transacoes">Transações</TabsTrigger>
              </TabsList>

              {/* Dashboard */}
              <TabsContent value="dashboard" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Gráfico de Pizza - Categorias */}
                  <Card className="bg-white dark:bg-slate-900">
                    <CardHeader>
                      <CardTitle>Despesas por Categoria</CardTitle>
                      <CardDescription>Distribuição dos seus gastos</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={categoryData.filter(c => 
                              filteredTransactions.find(t => t.category === c.name && t.type === "despesa")
                            )}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {categoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Gráfico de Barras - Top Categorias */}
                  <Card className="bg-white dark:bg-slate-900">
                    <CardHeader>
                      <CardTitle>Maiores Gastos</CardTitle>
                      <CardDescription>Top categorias de despesas</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                          data={categoryData
                            .filter(c => filteredTransactions.find(t => t.category === c.name && t.type === "despesa"))
                            .sort((a, b) => b.value - a.value)
                            .slice(0, 5)
                          }
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
                          <Bar dataKey="value" fill="#ef4444" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Histórico */}
              <TabsContent value="historico" className="space-y-6">
                <Card className="bg-white dark:bg-slate-900">
                  <CardHeader>
                    <CardTitle>Evolução Mensal</CardTitle>
                    <CardDescription>Acompanhe suas receitas e despesas ao longo do tempo</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={timelineData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="receitas" 
                          stroke="#10b981" 
                          strokeWidth={3}
                          name="Receitas"
                          dot={{ fill: "#10b981", r: 5 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="despesas" 
                          stroke="#ef4444" 
                          strokeWidth={3}
                          name="Despesas"
                          dot={{ fill: "#ef4444", r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Resumo por mês */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {timelineData.slice().reverse().map((data, index) => {
                    const saldoMes = data.receitas - data.despesas
                    return (
                      <Card key={index} className="bg-white dark:bg-slate-900">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg">{data.month}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600 dark:text-slate-400">Receitas:</span>
                            <span className="font-semibold text-emerald-600">
                              R$ {data.receitas.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600 dark:text-slate-400">Despesas:</span>
                            <span className="font-semibold text-red-600">
                              R$ {data.despesas.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm pt-2 border-t">
                            <span className="text-slate-600 dark:text-slate-400">Saldo:</span>
                            <span className={`font-bold ${saldoMes >= 0 ? "text-blue-600" : "text-orange-600"}`}>
                              R$ {saldoMes.toFixed(2)}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </TabsContent>

              {/* Transações */}
              <TabsContent value="transacoes">
                <Card className="bg-white dark:bg-slate-900">
                  <CardHeader>
                    <CardTitle>Todas as Transações</CardTitle>
                    <CardDescription>
                      {filteredTransactions.length} transações encontradas
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {filteredTransactions
                        .sort((a, b) => {
                          const [dayA, monthA, yearA] = a.date.split("/")
                          const [dayB, monthB, yearB] = b.date.split("/")
                          return new Date(`${yearB}-${monthB}-${dayB}`).getTime() - 
                                 new Date(`${yearA}-${monthA}-${dayA}`).getTime()
                        })
                        .map((transaction) => (
                          <div
                            key={transaction.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors gap-3"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium text-slate-900 dark:text-slate-100 truncate">
                                  {transaction.description}
                                </h4>
                                <Badge
                                  variant="outline"
                                  style={{
                                    backgroundColor: `${CATEGORY_COLORS[transaction.category]}20`,
                                    borderColor: CATEGORY_COLORS[transaction.category],
                                    color: CATEGORY_COLORS[transaction.category]
                                  }}
                                >
                                  {transaction.category}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                                <span>{transaction.date}</span>
                                <span>•</span>
                                <span className="truncate">{transaction.source}</span>
                              </div>
                            </div>
                            <div className={`text-lg font-bold whitespace-nowrap ${
                              transaction.type === "receita" 
                                ? "text-emerald-600" 
                                : "text-red-600"
                            }`}>
                              {transaction.type === "receita" ? "+" : "-"} R$ {transaction.amount.toFixed(2)}
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  )
}
