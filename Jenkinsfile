// Jenkins Pipeline для автотестов офтальмологического центра.
//
// Повторяет конвейер GitHub Actions: сборка/типы, Jest, Newman (API), Selenium (E2E).
//
// Требования к агенту Jenkins (Linux):
//   - Node.js 20+ и npm в PATH (например, через плагин NodeJS: tools { nodejs 'node20' })
//   - Google Chrome (для Selenium) — драйвер Selenium скачает сам
//   - утилита curl
//
// Заметка для Windows-агента: замените команды `sh` на `bat`, а синтаксис
// shell-скриптов — на cmd/PowerShell. Этот файл рассчитан на Unix-агента.

pipeline {
  agent any

  options {
    timeout(time: 30, unit: 'MINUTES')
    timestamps()
    disableConcurrentBuilds()
  }

  // Если установлен плагин NodeJS и сконфигурирован инструмент с именем 'node20',
  // раскомментируйте блок ниже, чтобы Jenkins сам подложил нужную версию Node.
  // tools {
  //   nodejs 'node20'
  // }

  environment {
    // Учебные значения. В реальном проекте — через Jenkins Credentials.
    JWT_SECRET = 'ci-jenkins-secret-32-characters-long-xx'
    PORT = '4000'
    // Чтобы фоновые серверы не убивались сразу — держим их в рамках одного шага.
    CI = 'true'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Зависимости') {
      steps {
        dir('backend') {
          sh 'npm install'
          sh 'npx prisma generate'
        }
        dir('frontend') {
          sh 'npm install'
        }
      }
    }

    stage('Сборка и проверка типов') {
      steps {
        dir('backend') {
          sh 'npx tsc --noEmit'
        }
        dir('frontend') {
          sh 'npm run build'
        }
      }
    }

    stage('Юнит-тесты (Jest)') {
      environment {
        NODE_ENV = 'test'
        DATABASE_URL = 'file:./test.db'
      }
      steps {
        dir('backend') {
          sh 'npx prisma db push --skip-generate'
          sh 'npm test'
        }
      }
    }

    stage('API-тесты (Newman)') {
      environment {
        NODE_ENV = 'development'
        DATABASE_URL = 'file:./dev.db'
      }
      steps {
        // Поднимаем backend, ждём готовности, прогоняем Postman-коллекцию и
        // в конце гарантированно останавливаем сервер (trap на выход).
        sh '''
          set -e
          cd backend
          npx prisma db push --skip-generate
          npm run seed
          npm run dev > backend.log 2>&1 &
          BACKEND_PID=$!
          trap "kill $BACKEND_PID 2>/dev/null || true" EXIT

          for i in $(seq 1 30); do
            curl -sf http://localhost:4000/api/health > /dev/null && break
            echo "Жду backend... ($i)"; sleep 2
          done
          curl -sf http://localhost:4000/api/health > /dev/null || { echo "Backend не запустился:"; cat backend.log; exit 1; }
          echo "Backend готов."

          npx --yes newman run ../postman_collection.json
        '''
      }
    }

    stage('E2E-тесты (Selenium)') {
      environment {
        NODE_ENV = 'development'
        DATABASE_URL = 'file:./dev.db'
        HEADLESS = '1'
      }
      steps {
        // Поднимаем backend и frontend, прогоняем Selenium-тест, затем
        // останавливаем оба сервера.
        sh '''
          set -e
          ( cd backend && npx prisma db push --skip-generate && npm run seed )

          ( cd backend && npm run dev > backend.log 2>&1 ) &
          BACKEND_PID=$!
          ( cd frontend && npm run dev > frontend.log 2>&1 ) &
          FRONTEND_PID=$!
          trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true" EXIT

          for i in $(seq 1 30); do
            curl -sf http://localhost:4000/api/health > /dev/null && break
            echo "Жду backend... ($i)"; sleep 2
          done
          curl -sf http://localhost:4000/api/health > /dev/null || { echo "Backend не запустился:"; cat backend/backend.log; exit 1; }

          for i in $(seq 1 30); do
            curl -sf http://localhost:5173/ > /dev/null && break
            echo "Жду frontend... ($i)"; sleep 2
          done
          curl -sf http://localhost:5173/ > /dev/null || { echo "Frontend не запустился:"; cat frontend/frontend.log; exit 1; }
          echo "Серверы готовы."

          cd frontend && npm run selenium:test
        '''
      }
    }
  }

  post {
    always {
      // Сохраняем логи серверов, если они остались, — пригодится при разборе падений.
      archiveArtifacts artifacts: 'backend/backend.log, frontend/frontend.log', allowEmptyArchive: true
      echo 'Конвейер завершён.'
    }
    success {
      echo '✅ Все тесты пройдены.'
    }
    failure {
      echo '❌ Есть упавшие тесты — смотрите лог соответствующего этапа.'
    }
  }
}
