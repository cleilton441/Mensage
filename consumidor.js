const net = require('net')
const readline = require('readline')

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
})

var listaDetopicos = ''

const consumidor = new net.Socket()

var topicos = []

var controleDaListatopicos = 0

var pacotePergunta = {
    topico: ``,
    tipo: 'Consumidor',
    confirmacao: false,
    primeiraComunicacao: false,
}

var pacoteConfirmacao = {
    topico: '',
    tipo: 'Consumidor',
    confirmacao: true,
    primeiraComunicacao: false,
    mensagemProdutor: false,
}

console.log("[+] Uso:\n    Tópico de interesse: <topico 1>\n    Tópico de interesse: <topico 2> ...\n")

function perguntarTopicos(){
    /*
        perguntarTopicos(null) => void
        
        A função se encarrega de pedir entradas ao usuário e a inicializar o processo de escuta dos tópicos.
    */

    console.log("\nPara começar a ouvir os tópicos digite: exit\n")
    rl.question("Tópico de interesse: ", (topicoPassado) => {

        if(topicoPassado == ''){
            perguntarTopicos()
            return
        }
        
        if(topicoPassado.toLowerCase() == 'exit'){

            if(topicos.length == 0){
                perguntarTopicos()
                return
            }

            rl.close()
            main()
            return
        }

        topicoPassado = topicoPassado.trim()

        topicos.push(topicoPassado)

        topicos = topicos.filter((item, index) => {
            return topicos.indexOf(item) === index;
        })

        perguntarTopicos()
    })
}


function main() {
    consumidor.connect(8888, '127.0.0.1', ()=> {
        console.log('\n[+] Ouvindo tópicos:\n')
        for(let i = 0; i < topicos.length; i++){
            listaDetopicos += `{"topico": "${topicos[i]}","tipo": "Consumidor","confirmacao": false, "primeiraComunicacao": true, "mensagemProdutor": false}\r\n`
            console.log('    ' + topicos[i])
        }

        console.log('\n')

        consumidor.write(Buffer.from(listaDetopicos))
    }) 
    
    consumidor.on('data', (data) => {
        let respostaServidor = data.toString()

        //Esse primeiro if, trata o caso em que chega uma mensagem originada de um produtor.
        if(respostaServidor.includes('"mensagemProdutor":true')){

            respostaServidor = respostaServidor.split('\r\n')

            for(let i = 0; i < respostaServidor.length-1; i++ ){
                respostaServidor[i] = JSON.parse(respostaServidor[i])
                console.log(`Mensagem do tópico ${respostaServidor[i].topico}:\n\n   ${respostaServidor[i].mensagem}\n\n`)  
            }

            pacoteConfirmacao.topico = respostaServidor[0].topico

            consumidor.write(Buffer.from(JSON.stringify(pacoteConfirmacao)))
            return
        }


        /*
            Processamento rotineiro da função. Vou iterando entre os tópicos e perguntando ao servidor
            se existem mensagens disponíveis.
        */
        pacotePergunta.topico = `${topicos[controleDaListatopicos]}`

        consumidor.write(Buffer.from(JSON.stringify(pacotePergunta)))
        controleDaListatopicos++;

        if(controleDaListatopicos == topicos.length){
            controleDaListatopicos = 0
        }

        return
    }) 

    consumidor.on('close', () => {
    })
}

perguntarTopicos()