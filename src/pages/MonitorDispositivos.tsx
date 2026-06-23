import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/cartao';
import { Badge } from '@/components/ui/etiqueta';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/tabela';
import { useLeiturasEsp32 } from '@/hooks/useLeiturasEsp32';
import { Activity, Sun, Zap, AlertTriangle, CheckCircle2, Radio } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function StatusBadge({ status }: { status: string }) {
  const ligado = status?.toUpperCase() === 'LIGADO';
  return (
    <Badge
      variant={ligado ? 'default' : 'secondary'}
      className={ligado ? 'bg-emerald-500 hover:bg-emerald-500 text-white' : ''}
    >
      {ligado ? <CheckCircle2 className="mr-1 h-3 w-3" /> : <Radio className="mr-1 h-3 w-3" />}
      {status || '—'}
    </Badge>
  );
}

function formatarValor(valor: unknown): string {
  if (valor === null || valor === undefined) return '—';
  if (typeof valor === 'number') return Number.isInteger(valor) ? String(valor) : valor.toFixed(2);
  if (typeof valor === 'boolean') return valor ? 'true' : 'false';
  if (typeof valor === 'object') return JSON.stringify(valor);
  return String(valor);
}

export default function MonitorDispositivos() {
  const { leituras, carregando, ultima, estadoTempoReal, ultimaActualizacao } = useLeiturasEsp32(50);
  const textoTempoReal = estadoTempoReal === 'ligado'
    ? 'Tempo real ligado'
    : estadoTempoReal === 'erro'
      ? 'Tempo real indisponível; a sincronizar automaticamente'
      : 'A ligar tempo real';

  const entradasPayload = ultima?.payload ? Object.entries(ultima.payload) : [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Monitoramento ESP32</h1>
        <p className="text-muted-foreground">
          Leituras recebidas em tempo real via webhook <code>/dispositivos</code>.
        </p>
        <p className="text-xs text-muted-foreground">
          {textoTempoReal} · Actualização imediata
          {ultimaActualizacao && ` · Última: ${format(ultimaActualizacao, 'HH:mm:ss', { locale: ptBR })}`}
        </p>
      </header>

      {/* Cards estado actual */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sensor LDR</CardTitle>
            <Sun className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{ultima ? ultima.ldr : '—'}</div>
            <p className="text-xs text-muted-foreground">Nível de luminosidade</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Poste Bom</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="space-y-2">
            <StatusBadge status={ultima?.poste_bom_status ?? 'DESLIGADO'} />
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground">Corrente</p>
                <p className="font-semibold">{ultima ? `${Number(ultima.corrente_poste_bom).toFixed(2)} mA` : '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Potência</p>
                <p className="font-semibold">{ultima ? `${Number(ultima.potencia_poste_bom).toFixed(2)} mW` : '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Poste Estragado</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent className="space-y-2">
            <StatusBadge status={ultima?.poste_estragado_status ?? 'DESLIGADO'} />
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground">Corrente</p>
                <p className="font-semibold">{ultima ? `${Number(ultima.corrente_poste_estragado).toFixed(2)} mA` : '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Potência</p>
                <p className="font-semibold">{ultima ? `${Number(ultima.potencia_poste_estragado).toFixed(2)} mW` : '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Todos os valores do JSON recebido */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-primary" />
            Todos os valores recebidos (JSON do ESP32)
          </CardTitle>
          <CardDescription>
            Cada chave enviada pelo dispositivo é apresentada abaixo em tempo real, sem exceção.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {entradasPayload.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Ainda não foi recebido nenhum JSON do ESP32.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {entradasPayload.map(([chave, valor]) => (
                <div
                  key={chave}
                  className="rounded-lg border bg-card p-3 space-y-1"
                >
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{chave}</p>
                  <p className="text-lg font-semibold break-all">{formatarValor(valor)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Histórico de leituras
          </CardTitle>
          <CardDescription>
            Últimas {leituras.length} leituras (actualiza automaticamente).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {carregando ? (
            <p className="text-sm text-muted-foreground py-8 text-center">A carregar leituras...</p>
          ) : leituras.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Zap className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Ainda não foram recebidas leituras. Configure o ESP32 para enviar POST para o endpoint <code>/dispositivos</code>.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>LDR</TableHead>
                    <TableHead>Poste Bom</TableHead>
                    <TableHead>Corrente B (mA)</TableHead>
                    <TableHead>Potência B (mW)</TableHead>
                    <TableHead>Poste Estragado</TableHead>
                    <TableHead>Corrente E (mA)</TableHead>
                    <TableHead>Potência E (mW)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leituras.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {format(new Date(l.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                      </TableCell>
                      <TableCell>{l.ldr}</TableCell>
                      <TableCell><StatusBadge status={l.poste_bom_status} /></TableCell>
                      <TableCell>{Number(l.corrente_poste_bom).toFixed(2)}</TableCell>
                      <TableCell>{Number(l.potencia_poste_bom).toFixed(2)}</TableCell>
                      <TableCell><StatusBadge status={l.poste_estragado_status} /></TableCell>
                      <TableCell>{Number(l.corrente_poste_estragado).toFixed(2)}</TableCell>
                      <TableCell>{Number(l.potencia_poste_estragado).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}