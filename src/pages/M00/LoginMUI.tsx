import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { login, resolveRedirect } from '@/lib/auth';

const techStackGroups = [
  {
    title: 'Frontend',
    items: [
      { name: 'React', version: '19.1.1', category: 'UI' },
      { name: 'TypeScript', version: '5.9.3', category: 'Language' },
      { name: 'Vite', version: 'Rolldown Vite 7.1.14', category: 'Build' },
      { name: 'Material UI', version: '7.3.8', category: 'UI' },
      { name: 'React Router', version: '7.9.4', category: 'Routing' },
      { name: 'TanStack Query', version: '5.90.2', category: 'Server State' },
      { name: 'Axios', version: '1.13.6', category: 'HTTP' },
      { name: 'Tailwind CSS', version: '4.1.14', category: 'Styling' },
      { name: 'Radix UI', version: 'Dialog 1.1.15', category: 'UI' },
      { name: 'Lucide React', version: '0.545.0', category: 'Icons' },
      { name: 'Vitest', version: '3.2.4', category: 'Test' },
      { name: 'ESLint / Prettier', version: '9.36.0 / 3.3.3', category: 'Quality' },
    ],
  },
  {
    title: 'Backend',
    items: [
      { name: 'Java', version: 'Toolchain 25', category: 'Language' },
      { name: 'Spring Boot', version: '4.0.2', category: 'Framework' },
      { name: 'Spring Cloud', version: '2025.1.1', category: 'MSA' },
      { name: 'Spring Security', version: 'Boot Starter', category: 'Security' },
      { name: 'JWT', version: 'JJWT', category: 'Auth' },
      { name: 'Spring Cloud Gateway', version: 'WebFlux', category: 'Gateway' },
      { name: 'Eureka', version: 'Server / Client', category: 'Discovery' },
      { name: 'Spring Cloud Config', version: 'Config Server / Client', category: 'Config' },
      { name: 'Spring Data JPA', version: 'Hibernate', category: 'ORM' },
      { name: 'MyBatis', version: 'Spring Boot Starter', category: 'SQL Mapper' },
      { name: 'QueryDSL', version: 'Jakarta', category: 'Query' },
      { name: 'PostgreSQL / MySQL / MariaDB', version: 'JDBC Drivers', category: 'Database' },
      { name: 'Redis', version: 'Spring Data Redis', category: 'Cache' },
      { name: 'Kafka', version: 'Spring Kafka', category: 'Messaging' },
      { name: 'Springdoc OpenAPI', version: '3.0.0', category: 'API Docs' },
      { name: 'Lombok', version: 'Annotation Processor', category: 'Productivity' },
      { name: 'Gradle', version: 'Multi-project Build', category: 'Build' },
      { name: 'Docker / Kubernetes / Helm', version: 'Infra Manifests', category: 'Deploy' },
    ],
  },
];

const formatTechLabel = (name: string, version: string) => `${name} ${version}`;

export default function LoginMuiPage() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [techDialogOpen, setTechDialogOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: Location })?.from?.pathname;

  const onLogin = async () => {
    if (!userId || !password || submitting) return;

    setSubmitting(true);
    setError(null);

    const res = await login({ userId, password });
    setSubmitting(false);

    if ('error' in res) {
      setError(res.error ?? '로그인 처리 중 오류가 발생했습니다.');
      return;
    }

    navigate(resolveRedirect(from), { replace: true });
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        bgcolor: 'grey.50',
      }}
    >
      <Container maxWidth={false} sx={{ width: { xs: '100%', sm: 326 }, px: { xs: 2, sm: 0 } }}>
        <Card
          elevation={2}
          sx={{
            borderRadius: 3,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <CardHeader title="계정 로그인" sx={{ pb: 1 }} titleTypographyProps={{ variant: 'h6' }} />
          <CardContent sx={{ pt: 1 }}>
            <Stack
              component="form"
              spacing={1.5}
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                void onLogin();
              }}
            >
              {error && <Alert severity="error">{error}</Alert>}

              <TextField
                label="아이디"
                name="userId"
                placeholder="아이디"
                autoComplete="username"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                inputProps={{ maxLength: 64 }}
                required
                fullWidth
                size="small"
              />

              <TextField
                label="비밀번호"
                name="password"
                type="password"
                placeholder="비밀번호"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                inputProps={{ maxLength: 128 }}
                required
                fullWidth
                size="small"
              />

              <Box sx={{ pt: 0.5, display: 'flex', justifyContent: 'center' }}>
                <Button type="submit" variant="contained" disabled={submitting} size="small">
                  {submitting ? '로그인 중...' : '로그인'}
                </Button>
              </Box>
            </Stack>
          </CardContent>
          <Box sx={{ pb: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              MES System
            </Typography>
            <Button
              size="small"
              variant="text"
              sx={{ mt: 0.5 }}
              onClick={() => setTechDialogOpen(true)}
            >
              사용 기술
            </Button>
          </Box>
        </Card>
      </Container>

      <Dialog
        open={techDialogOpen}
        onClose={() => setTechDialogOpen(false)}
        fullWidth
        maxWidth="sm"
        slotProps={{
          paper: {
            sx: {
              width: { xs: 'calc(100% - 32px)', sm: 326 },
              maxWidth: 'calc(100% - 32px)',
              height: { sm: 488 },
              maxHeight: 'min(488px, calc(100vh - 32px))',
              m: { xs: 2, sm: 0 },
              position: { sm: 'fixed' },
              left: { sm: 'calc(50% + 163px)' },
              right: { xs: 16, sm: 'auto' },
              top: { sm: '50%' },
              transform: { sm: 'translateY(-50%)' },
            },
          },
        }}
      >
        <DialogTitle sx={{ px: 1.5, py: 1, fontSize: 16 }}>현재 사용하는 기술</DialogTitle>
        <DialogContent dividers sx={{ px: 1.5, py: 1 }}>
          <Stack spacing={1.25}>
            {techStackGroups.map((group) => (
              <Box key={group.title}>
                <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 700 }}>
                  {group.title}
                </Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    columnGap: 0.75,
                    rowGap: 0.35,
                  }}
                >
                  {group.items.map((tech) => (
                    <Typography
                      key={`${group.title}-${tech.name}-${tech.category}`}
                      title={tech.category}
                      sx={{
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontSize: 10,
                        lineHeight: '16px',
                      }}
                    >
                      {formatTechLabel(tech.name, tech.version)}
                    </Typography>
                  ))}
                </Box>
              </Box>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 1.5, py: 0.75 }}>
          <Button onClick={() => setTechDialogOpen(false)} size="small">
            닫기
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
