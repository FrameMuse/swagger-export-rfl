import { getSchemaType } from "./helpers"
import { ActionArgs, Parameter, Paths } from "./types"

function reduceParameters(parameters: Parameter[]): ActionArgs {
  return parameters.reduce((result, next) => ({ ...result, [next.name]: { required: next.required ?? true, schemaType: getSchemaType(next.schema) } }), {} as ActionArgs)
}

function joinArgs(args: ActionArgs) {
  return Object.keys(args).map(arg => `${arg}${args[arg].required ? "" : "?"}: ${args[arg].schemaType}`).join(", ")
}

function generateActions(paths: Paths) {
  const lines: string[] = []
  for (const path in paths) {
    const pathMethods = paths[path]
    for (const pathMethod in pathMethods) {
      const pathContent = pathMethods[pathMethod]
      const pathContentParameters = pathContent.parameters || []
      const pathContentRequestBody = pathContent.requestBody
      const pathContentResponseCodes = Object.keys(pathContent.responses)

      const requestBody = pathContentRequestBody?.content["multipart/form-data"]
      const requestBodyType = requestBody && getSchemaType(requestBody.schema)

      const args: ActionArgs = reduceParameters(pathContentParameters)
      const argsString = joinArgs(args)

      const params = reduceParameters(pathContentParameters.filter(param => param.in === "query"))
      const paramsString = Object.keys(params).join(", ")

      const action = path
        .replace(/{/g, "By/")
        .replace(/}/g, "")
        .replace(/\/(\w)/g, (_, g) => String(g).toUpperCase())
        .replace(/\//g, "")
        .replace(/_(\w)/g, (_, g) => String(g).toUpperCase())

      const okCode = pathContentResponseCodes.find(code => Number(code) >= 200 && Number(code) < 300)
      const payload = okCode && getSchemaType(pathContent.responses[okCode].content["application/json"].schema)
      const returnType = payload ? `Action<${payload}>` : "Action"

      lines.push(`\n`)
      lines.push(`export const ${pathMethod}${action} = (${argsString}${requestBodyType ? `${argsString.length ? ", " : ""}body: ${requestBodyType}` : ""}): ${returnType} => ({\n`)
      lines.push(`  method: "${pathMethod.toUpperCase()}",\n`)
      lines.push(`  endpoint: \`${path.replace(/{/g, "${")}\``)
      if (paramsString.length > 0) {
        lines.push(`,\n  params: { ${paramsString} }`)
      }
      if (requestBodyType) {
        lines.push(`,\n  body`)
      }
      lines.push(`\n})\n`)
    }
  }
  return lines.join("")
}

export default generateActions