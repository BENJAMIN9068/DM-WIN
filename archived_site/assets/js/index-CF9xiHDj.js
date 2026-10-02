import{a7 as b,b as h,l as g,r as B,C as P,A as C,aW as M,_ as x,P as m,H as o,I as i,Q as R,af as $,T as e,U as a,ai as f,aj as y}from"./index-DSllDNEm.js";const w=b({__name:"index",setup(k,{expose:s}){s();const{t:l}=h(),t=g(),r=B([{title:l("betAmounts"),body:[]},{title:l("rewordPercent"),body:[]}]),d=async()=>{const c=await C(M());c&&c.data.map(p=>(r[0].body.push(p.lotteryAmount+""),r[1].body.push(p.exchange_Rate*1e3*100/1e3+"%"),p))};P(()=>{d()});function _(){t.back()}const n={$t:l,router:t,pointRule:r,getProductRules:d,onClick:_,toBet:()=>{sessionStorage.setItem("clickedGameType","lottery"),t.push({path:"/"})}};return Object.defineProperty(n,"__isScriptSetup",{enumerable:!1,value:!0}),n}}),A={class:"pointMall-rule__container content"},N={class:"pointMall-rule__container-pointRule"},I={class:"pointMall-rule__container-pointRule__title"},S={class:"pointMall-rule__container-pointRule__body"},j={class:"toBet"};function V(k,s,l,t,r,d){const _=m("NavBar"),v=m("van-icon");return o(),i("div",A,[R(_,{title:t.$t("pointsRule"),"left-arrow":"",onClickLeft:t.onClick},null,8,["title"]),$(` <div class="pointMall-rule__container-claimRule">
			<div class="pointMall-rule__container-claimRule__title">1.{{ $t('claimPoints') }}</div>
			<div class="pointMall-rule__container-claimRule__body">
				<div>{{ $t('descRules1') }}</div>
				<div>
					<p>{{ $t('inviteFriends') }}</p>
					<p>{{ $t('earnPoints') }}</p>
				</div>
				<div @click="router.push({ path: '/main/InvitationBonus' })">
					<span> {{ $t('toClaim') }} </span>
					<van-icon name="upgrade" />
				</div>
			</div>
		</div> `),e("div",N,[e("div",I,a(t.$t("bonusPoints")),1),e("div",S,[e("div",null,a(t.$t("descRules2")),1),e("div",null,[(o(!0),i(f,null,y(t.pointRule,(n,c)=>(o(),i("div",{key:c},[e("p",null,a(n.title),1),(o(!0),i(f,null,y(n.body,u=>(o(),i("li",{key:u},a(u),1))),128))]))),128))]),e("div",{onClick:s[0]||(s[0]=n=>t.toBet())},[e("span",j,a(t.$t("goBetting")),1),R(v,{name:"upgrade",color:"#D23838"})])])])])}const F=x(w,[["render",V],["__scopeId","data-v-26d63714"],["__file","/home/jenkins/agent/workspace/AR103-Pages-india-dmfirst/src/views/activity/PointMall/Rules/index.vue"]]);export{F as default};
