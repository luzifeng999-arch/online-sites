import{u as n}from"./useWanqingSnapshot-B-YR6Rcv.js";import{R as p}from"./RepoBanner-CUZTTVFq.js";import{i as v,l as s,e as d,h as m,f as u,a as e,t as a,u as f,g as o,F as b,p as g,d as y,c as R,_ as I}from"./index-RuDrIYn2.js";const _={class:"real-page"},x={key:0,class:"section"},N={class:"section-title"},V={class:"proof"},S={class:"vocab-grid"},h={class:"vocab-tag"},q={class:"vocab-count"},k=`{
  "type": "el-form",
  "props": { "labelWidth": "80px" },
  "children": [
    { "type": "el-form-item", "label": "姓名",
      "children": [{ "type": "el-input", "props": { "placeholder": "请输入" } }] },
    { "type": "el-form-item", "label": "年龄",
      "children": [{ "type": "el-select",
        "children": [{ "type": "el-option", "props": { "label": "18-25" } }] }] },
    { "type": "el-button", "props": { "type": "primary" }, "text": "提交" }
  ]
}`,B=`<el-form label-width="80px">
  <el-form-item label="姓名">
    <el-input placeholder="请输入" />
  </el-form-item>
  <el-form-item label="年龄">
    <el-select>
      <el-option label="18-25" />
    </el-select>
  </el-form-item>
  <el-button type="primary">提交</el-button>
</el-form>`,T=v({__name:"IR",setup(w){const{snapshot:c}=n(),r=R(()=>{var l;return((l=c.value)==null?void 0:l.elementUsage.slice(0,12))||[]});return(l,t)=>(s(),d("div",_,[m(p),t[7]||(t[7]=u('<div class="head-extra" data-v-25aafcd8><div class="head-icon" data-v-25aafcd8>⚡️</div><div data-v-25aafcd8><div class="head-title" data-v-25aafcd8>IR 中间表示</div><div class="head-sub" data-v-25aafcd8>把 <code data-v-25aafcd8>设计意图</code> 转成 <code data-v-25aafcd8>结构化 JSON</code>，再编译成万擎仓库的 <code data-v-25aafcd8>el-* 组件树</code></div></div></div><div class="concept-card" data-v-25aafcd8><div class="concept-title" data-v-25aafcd8>🧠 IR 是什么？</div><div class="concept-desc" data-v-25aafcd8> IR (Intermediate Representation) 是 Norman 把&quot;自然语言需求&quot;转成&quot;可执行 Vue 代码&quot;中间的标准化结构。 它包含<strong data-v-25aafcd8>布局 / 组件类型 / 属性 / 子节点</strong>四要素，与具体框架解耦。 </div></div>',2)),e("div",{class:"section"},[t[5]||(t[5]=e("div",{class:"section-title"}," 🔍 真实 IR 示例（基于万擎仓库 Top5 组件构造） ",-1)),e("div",{class:"ir-demo"},[t[2]||(t[2]=e("div",{class:"demo-side"},[e("div",{class:"side-title"},"📝 设计意图"),e("div",{class:"side-body"},'"做一个表单：姓名输入 + 年龄选择 + 提交按钮"')],-1)),t[3]||(t[3]=e("div",{class:"demo-arrow"},"→",-1)),e("div",{class:"demo-side ir"},[t[0]||(t[0]=e("div",{class:"side-title"},"⚡️ IR JSON",-1)),e("pre",{class:"side-code"},a(k))]),t[4]||(t[4]=e("div",{class:"demo-arrow"},"→",-1)),e("div",{class:"demo-side"},[t[1]||(t[1]=e("div",{class:"side-title"},"🎯 编译后 Vue",-1)),e("pre",{class:"side-code"},a(B))])])]),f(c)?(s(),d("div",x,[e("div",N,[t[6]||(t[6]=o(" 📚 IR 组件词汇表 ",-1)),e("span",V,"基于仓库 TOP "+a(r.value.length)+" 个 el-* 组件",1)]),e("div",S,[(s(!0),d(b,null,g(r.value,i=>(s(),d("div",{key:i.tag,class:"vocab-card"},[e("div",h,[e("code",null,a(i.tag),1)]),e("div",q,a(i.count.toLocaleString())+" 次使用",1)]))),128))])])):y("",!0),t[8]||(t[8]=e("div",{class:"proof-note"},[o(" ⚠️ "),e("strong",null,"当前 IR 引擎为概念演示。"),o(" 真实 vue→AST→IR 解析引擎计划在下一阶段实现，将基于 "),e("code",null,"@vue/compiler-sfc"),o("。 ")],-1))]))}}),F=I(T,[["__scopeId","data-v-25aafcd8"]]);export{F as default};
