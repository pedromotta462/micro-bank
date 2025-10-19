#!/bin/bash

echo "🚀 Iniciando todos os serviços do Micro Bank..."
echo ""

# Função para iniciar um serviço
start_service() {
    local service=$1
    local port=$2
    local log_file="/tmp/${service}.log"
    
    echo "📦 Iniciando ${service} na porta ${port}..."
    cd /home/pedro_motta/projetos/micro-bank
    yarn run start:${service} > ${log_file} 2>&1 &
    local pid=$!
    echo "   PID: ${pid}"
    echo "   Logs: ${log_file}"
}

# Iniciar serviços
start_service "users" "3002"
sleep 5

start_service "transactions" "3001"
sleep 5

start_service "" "3000"  # api-gateway (comando: yarn run start)
sleep 10

echo ""
echo "✅ Todos os serviços iniciados!"
echo ""
echo "📚 Documentação Swagger disponível em:"
echo "   🌐 API Gateway:          http://localhost:3000/api/docs"
echo "   🌐 Users Service:        http://localhost:3002/api/docs"
echo "   🌐 Transactions Service: http://localhost:3001/api/docs"
echo ""
echo "🔍 Health Checks:"
echo "   ✓ API Gateway:          http://localhost:3000/api/health"
echo "   ✓ Users Service:        http://localhost:3002/api/health"
echo "   ✓ Transactions Service: http://localhost:3001/api/health"
echo ""
echo "📋 Para parar todos os serviços, execute: pkill -f 'nx serve'"
