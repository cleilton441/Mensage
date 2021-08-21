const net = require('net')
const readline = require('readline')

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
})

const cliente = new net.Socket()

var perguntarTopicoMensagem = ( conexao ) => {

    /*
        perguntarTopicoMensagem(Socket) => void
        
        O propósito da função é fazer com que o usuário entre com dados para definir a mensagem a
        ser mandada ao servidor.
    */

    rl.question('Tópico: ', ( topico ) => {

        //Se o que for digitado em Tópico: for exit, então o programa terminará.
        if (topico == 'exit'){
            process.exit(1)
        }
        
        rl.question('Mensagem: ', ( mensagem ) => {
            // Tratamento para o caso em que não é digitado absolutamente nada na mensagem. 
            if (mensagem == '') mensagem = ' ' 

            topico = topico.trim() 
            mensagem = mensagem.trim()
            
            enviar(topico, mensagem, conexao)
        })
    });
  };
  

function enviar(topico, mensagem, conexao){

    /*
        enviar(string, string, Socket) => void
        
        Função que monta o pacote com a mensagem e o tópico a ser enviado ao servidor.
    */
    
    const pacote = {
        topico: topico,
        mensagem: mensagem,
        tipo: 'Produtor',
        confirmacao: false,
        primeiraComunicacao: false,
        mensagemProdutor: true,
    }

    conexao.write(Buffer.from(JSON.stringify(pacote)))
} 

function main(){

    /*
        main(null) => void

        A função implementa a lógica de comunicação com o servidor. 
    */


    console.log("[+] Iniciando Client")

    let conexao = cliente.connect(8888, '127.0.0.1', () => {
        console.log("[+] Servidor pronto para mensagens!")
        console.log("[+] Caso o tópico escrito for: exit\n    O programa terminará.")
        console.log("[+] Uso:\n Tópico: <Tópico Desejado. Ex.: Tópico A>\n Mensagem: <Mensagem desejada>\n")
        perguntarTopicoMensagem(conexao)
    })

    cliente.on("data", () => {
        console.log("\n[+] Servidor pronto para próxima mensagem!\n")
        perguntarTopicoMensagem(conexao)
    })

    cliente.on("error", () => {})

    cliente.on("close", () => {})
}

main()